import { describe, expect, it } from 'vitest';
import {
  ContainableNode,
  isTargetOutsideElements,
  shouldDismissOnKeyDown,
} from '../useOnClickOutside';

function createMockContainer(children: unknown[] = []): ContainableNode<unknown> {
  const node: ContainableNode<unknown> = {
    contains(target: unknown) {
      return target === node || children.includes(target);
    },
  };
  return node;
}

describe('useOnClickOutside pure boundary & keyboard dismissal logic', () => {
  it('returns true when clicking on a backdrop or element outside the modal container', () => {
    const innerChild = { id: 'inner-button' };
    const modalContent = createMockContainer([innerChild]);
    const backdropElement = { id: 'modal-backdrop' };

    expect(isTargetOutsideElements(backdropElement, modalContent)).toBe(true);
  });

  it('returns false when clicking directly on the modal content container or any child inside it', () => {
    const innerInput = { id: 'inner-input' };
    const modalContent = createMockContainer([innerInput]);

    expect(isTargetOutsideElements(modalContent, modalContent)).toBe(false);
    expect(isTargetOutsideElements(innerInput, modalContent)).toBe(false);
  });

  it('returns false when the modal ref or event target is null/undefined', () => {
    const modalContent = createMockContainer();

    expect(isTargetOutsideElements(null, modalContent)).toBe(false);
    expect(isTargetOutsideElements({ id: 'outside' }, null)).toBe(false);
    expect(isTargetOutsideElements(undefined, undefined)).toBe(false);
  });

  it('respects optional ignored elements (such as a trigger button)', () => {
    const modalContent = createMockContainer();
    const triggerIcon = { id: 'trigger-icon' };
    const triggerButton = createMockContainer([triggerIcon]);
    const randomOutsideArea = { id: 'page-body' };

    expect(
      isTargetOutsideElements(triggerButton, modalContent, [triggerButton])
    ).toBe(false);
    expect(
      isTargetOutsideElements(triggerIcon, modalContent, [triggerButton])
    ).toBe(false);
    expect(
      isTargetOutsideElements(randomOutsideArea, modalContent, [triggerButton])
    ).toBe(true);
  });

  it('dismisses on Escape key only when closeOnEscape is enabled', () => {
    expect(shouldDismissOnKeyDown('Escape', true)).toBe(true);
    expect(shouldDismissOnKeyDown('Enter', true)).toBe(false);
    expect(shouldDismissOnKeyDown('Escape', false)).toBe(false);
  });
});
