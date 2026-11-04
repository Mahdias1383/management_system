import { useEffect, useRef } from 'react';
import { AdminSidebarSection } from '../types/shortcuts';
import { isEditableElement } from '../utils/commandPaletteUtils';

export interface UseAdminShortcutsOptions {
  onToggleCommandPalette: () => void;
  onOpenShortcutsHelp: () => void;
  onNavigateSection: (section: AdminSidebarSection) => void;
  onExportCsv?: () => void;
  onSyncActiveData?: () => void;
  onToggleLang?: () => void;
  onToggleTheme?: () => void;
  onNewSpecialist?: () => void;
  enabled?: boolean;
}

/**
 * Global keyboard shortcuts hook for the Admin Backoffice.
 * Supports:
 * - Ctrl+K / Cmd+K: Open/close Command Palette
 * - ?: Open Shortcuts Cheatsheet
 * - G then O/S/L/C/Q: Sequential Vim/Linear/GitHub style navigation
 * - Alt+1..5: Direct number-based screen navigation
 * - Alt+E: Immediate Compliance CSV Export
 * - Alt+R: Refresh/Sync active dataset
 * - Alt+N: Jump to New Specialist form
 * - Alt+L: Toggle Language
 * - Alt+T: Toggle Theme
 */
export function useAdminShortcuts({
  onToggleCommandPalette,
  onOpenShortcutsHelp,
  onNavigateSection,
  onExportCsv,
  onSyncActiveData,
  onToggleLang,
  onToggleTheme,
  onNewSpecialist,
  enabled = true,
}: UseAdminShortcutsOptions): void {
  const pendingSequenceRef = useRef<string | null>(null);
  const sequenceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const clearSequence = () => {
      pendingSequenceRef.current = null;
      if (sequenceTimerRef.current !== null) {
        window.clearTimeout(sequenceTimerRef.current);
        sequenceTimerRef.current = null;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Universal Command Palette trigger: Ctrl+K / Cmd+K (allowed everywhere, even in inputs)
      if ((event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        clearSequence();
        onToggleCommandPalette();
        return;
      }

      // If typing inside an input, textarea, or select, do not trigger single-key or sequence shortcuts
      const isTyping = isEditableElement(event.target);
      if (isTyping) {
        return;
      }

      // 2. Help shortcut: ? or Shift+/
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        clearSequence();
        onOpenShortcutsHelp();
        return;
      }

      // 3. Two-key sequence handling ('g' then key)
      if (pendingSequenceRef.current === 'g') {
        const nextKey = event.key.toLowerCase();
        let handled = false;

        switch (nextKey) {
          case 'o':
            onNavigateSection('OVERVIEW');
            handled = true;
            break;
          case 's':
            onNavigateSection('STAFF_HR');
            handled = true;
            break;
          case 'l':
          case 'a':
            onNavigateSection('AUDIT');
            handled = true;
            break;
          case 'c':
            onNavigateSection('ALERT_CENTER');
            handled = true;
            break;
          case 'q':
            onNavigateSection('QA_SUITE');
            handled = true;
            break;
          default:
            break;
        }

        clearSequence();
        if (handled) {
          event.preventDefault();
          return;
        }
      }

      // Start sequence when pressing standalone 'g'
      if (
        (event.key === 'g' || event.key === 'G') &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        pendingSequenceRef.current = 'g';
        if (sequenceTimerRef.current !== null) {
          window.clearTimeout(sequenceTimerRef.current);
        }
        sequenceTimerRef.current = window.setTimeout(clearSequence, 1200);
        return;
      }

      // 4. Alt / Option Direct Shortcuts
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const k = event.key.toLowerCase();
        switch (k) {
          case '1':
            event.preventDefault();
            clearSequence();
            onNavigateSection('OVERVIEW');
            return;
          case '2':
            event.preventDefault();
            clearSequence();
            onNavigateSection('STAFF_HR');
            return;
          case '3':
            event.preventDefault();
            clearSequence();
            onNavigateSection('AUDIT');
            return;
          case '4':
            event.preventDefault();
            clearSequence();
            onNavigateSection('ALERT_CENTER');
            return;
          case '5':
            event.preventDefault();
            clearSequence();
            onNavigateSection('QA_SUITE');
            return;
          case 'e':
            if (onExportCsv) {
              event.preventDefault();
              clearSequence();
              onExportCsv();
              return;
            }
            break;
          case 'r':
            if (onSyncActiveData) {
              event.preventDefault();
              clearSequence();
              onSyncActiveData();
              return;
            }
            break;
          case 'n':
            if (onNewSpecialist) {
              event.preventDefault();
              clearSequence();
              onNewSpecialist();
              return;
            }
            break;
          case 'l':
            if (onToggleLang) {
              event.preventDefault();
              clearSequence();
              onToggleLang();
              return;
            }
            break;
          case 't':
            if (onToggleTheme) {
              event.preventDefault();
              clearSequence();
              onToggleTheme();
              return;
            }
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearSequence();
    };
  }, [
    enabled,
    onToggleCommandPalette,
    onOpenShortcutsHelp,
    onNavigateSection,
    onExportCsv,
    onSyncActiveData,
    onToggleLang,
    onToggleTheme,
    onNewSpecialist,
  ]);
}
