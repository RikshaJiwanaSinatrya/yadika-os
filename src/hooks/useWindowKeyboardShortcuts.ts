import { useEffect } from 'react';
import { useWindowStore } from '../store/windowStore';
import { TASKBAR_HEIGHT } from '../lib/constants';
import type { WorkArea } from '../types/window';

function getWorkArea(): WorkArea {
  return { width: window.innerWidth, height: window.innerHeight - TASKBAR_HEIGHT };
}

/**
 * Global window management shortcuts:
 *  - Meta/Ctrl + ArrowLeft / ArrowRight  → snap to that half (toggle)
 *  - Meta/Ctrl + ArrowUp                 → maximize
 *  - Meta/Ctrl + ArrowDown               → restore from snap/maximize, else minimize
 *  - Escape                              → restore the active snapped/maximized window
 * Note: the codebase deliberately avoids overriding browser-native combos, so
 * these are registered as a passive key handler.
 */
export function useWindowKeyboardShortcuts() {
  const activeWindowId = useWindowStore((s) => s.activeWindowId);
  const windows = useWindowStore((s) => s.windows);
  const snapWindow = useWindowStore((s) => s.snapWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeWindowId) return;
      const win = windows[activeWindowId];
      if (!win) return;

      const modifier = event.metaKey || event.ctrlKey;

      if (event.key === 'Escape') {
        if (win.snap || win.isMaximized) {
          event.preventDefault();
          snapWindow(win.id, 'full', getWorkArea());
        }
        return;
      }

      if (event.key === 'w' && modifier) {
        event.preventDefault();
        closeWindow(win.id);
        return;
      }

      if (event.altKey && event.key === 'F4') {
        event.preventDefault();
        closeWindow(win.id);
        return;
      }

      if (!modifier || event.altKey) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          snapWindow(win.id, 'left', getWorkArea());
          break;
        case 'ArrowRight':
          event.preventDefault();
          snapWindow(win.id, 'right', getWorkArea());
          break;
        case 'ArrowUp':
          event.preventDefault();
          toggleMaximize(win.id, getWorkArea());
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (win.snap || win.isMaximized) {
            snapWindow(win.id, 'full', getWorkArea());
          } else {
            minimizeWindow(win.id);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeWindowId, windows, snapWindow, toggleMaximize, minimizeWindow, closeWindow]);
}
