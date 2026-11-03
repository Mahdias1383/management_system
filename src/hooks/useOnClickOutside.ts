import { RefObject, useEffect, useRef } from 'react';

export interface ContainableNode<TTarget = Node | null> {
  contains: (target: TTarget) => boolean;
}

export interface UseOnClickOutsideOptions {
  /** Whether the outside-click listener is active (defaults to true) */
  enabled?: boolean;
  /** Whether pressing the Escape key should also invoke the handler (defaults to true) */
  closeOnEscape?: boolean;
  /** Optional additional refs (such as a trigger button) that should not count as outside clicks */
  ignoreRefs?: Array<RefObject<ContainableNode<Node | null> | null>>;
}

/**
 * Pure helper function that determines whether an event target is outside
 * the primary container element and any optional ignored elements.
 */
export function isTargetOutsideElements<TTarget = Node | null>(
  target: TTarget | null | undefined,
  primaryElement: ContainableNode<TTarget> | null | undefined,
  ignoredElements: Array<ContainableNode<TTarget> | null | undefined> = []
): boolean {
  if (!primaryElement || !target) {
    return false;
  }

  if (primaryElement.contains(target)) {
    return false;
  }

  for (const ignored of ignoredElements) {
    if (ignored && ignored.contains(target)) {
      return false;
    }
  }

  return true;
}

/**
 * Pure helper function to check if a keyboard event should trigger dismissal.
 */
export function shouldDismissOnKeyDown(key: string, closeOnEscape = true): boolean {
  return Boolean(closeOnEscape && key === 'Escape');
}

/**
 * Custom hook that detects clicks/touches outside of the specified element ref
 * (as well as optional Escape key presses) to automatically close modals,
 * pop-up dialogues, dropdowns, and overlay components.
 */
export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent | KeyboardEvent) => void,
  options: UseOnClickOutsideOptions = {}
): void {
  const { enabled = true, closeOnEscape = true, ignoreRefs = [] } = options;
  const handlerRef = useRef(handler);
  const ignoreRefsRef = useRef(ignoreRefs);

  useEffect(() => {
    handlerRef.current = handler;
    ignoreRefsRef.current = ignoreRefs;
  });

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return;
    }

    const handlePointerEvent = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      const ignoredNodes = ignoreRefsRef.current.map((r) => r.current);

      if (isTargetOutsideElements(target, ref.current, ignoredNodes)) {
        handlerRef.current(event);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldDismissOnKeyDown(event.key, closeOnEscape)) {
        handlerRef.current(event);
      }
    };

    document.addEventListener('mousedown', handlePointerEvent);
    document.addEventListener('touchstart', handlePointerEvent, { passive: true });
    if (closeOnEscape) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerEvent);
      document.removeEventListener('touchstart', handlePointerEvent);
      if (closeOnEscape) {
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [ref, enabled, closeOnEscape]);
}

export default useOnClickOutside;

