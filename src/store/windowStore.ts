import { create } from 'zustand';
import { APP_REGISTRY } from '../apps/registry';
import {
  BASE_Z_INDEX,
  TASKBAR_HEIGHT,
  WINDOW_CASCADE_OFFSET,
} from '../lib/constants';
import type {
  WindowPosition,
  WindowSize,
  WindowState,
} from '../types/window';

interface WindowStore {
  windows: Record<string, WindowState>;
  activeWindowId: string | null;
  nextZIndex: number;
  openWindow: (appId: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string, workArea: WindowSize) => void;
  moveWindow: (id: string, position: WindowPosition) => void;
  resizeWindow: (id: string, size: WindowSize) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The visible (non-minimized) window with the highest z-index. */
function topmostVisibleWindow(windows: Record<string, WindowState>): WindowState | null {
  let top: WindowState | null = null;
  for (const win of Object.values(windows)) {
    if (win.isMinimized) continue;
    if (!top || win.zIndex > top.zIndex) top = win;
  }
  return top;
}

function createWindowState(appId: string, cascadeIndex: number, zIndex: number): WindowState | null {
  const app = APP_REGISTRY[appId];
  if (!app) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight - TASKBAR_HEIGHT;
  const width = Math.min(app.defaultSize.width, viewportWidth - 24);
  const height = Math.min(app.defaultSize.height, viewportHeight - 24);

  const offset = (cascadeIndex % 8) * WINDOW_CASCADE_OFFSET;
  const position: WindowPosition = {
    x: clamp((viewportWidth - width) / 2 + offset, 0, viewportWidth - width),
    y: clamp((viewportHeight - height) / 2 + offset, 0, viewportHeight - height),
  };

  return {
    id: crypto.randomUUID(),
    appId,
    title: app.title,
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex,
    position,
    size: { width, height },
    previousBounds: null,
  };
}

export const useWindowStore = create<WindowStore>((set) => ({
  windows: {},
  activeWindowId: null,
  nextZIndex: BASE_Z_INDEX,

  openWindow: (appId) =>
    set((state) => {
      // One instance per app in Phase 1: re-opening focuses the existing window.
      const existing = Object.values(state.windows).find((win) => win.appId === appId);
      if (existing) {
        return {
          windows: {
            ...state.windows,
            [existing.id]: {
              ...existing,
              isMinimized: false,
              zIndex: state.nextZIndex,
            },
          },
          activeWindowId: existing.id,
          nextZIndex: state.nextZIndex + 1,
        };
      }

      const win = createWindowState(appId, Object.keys(state.windows).length, state.nextZIndex);
      if (!win) return state;

      return {
        windows: { ...state.windows, [win.id]: win },
        activeWindowId: win.id,
        nextZIndex: state.nextZIndex + 1,
      };
    }),

  closeWindow: (id) =>
    set((state) => {
      if (!(id in state.windows)) return state;
      const windows = { ...state.windows };
      delete windows[id];

      const activeWindowId =
        state.activeWindowId === id ? (topmostVisibleWindow(windows)?.id ?? null) : state.activeWindowId;

      return { windows, activeWindowId };
    }),

  focusWindow: (id) =>
    set((state) => {
      const win = state.windows[id];
      if (!win || (state.activeWindowId === id && !win.isMinimized)) return state;

      return {
        windows: {
          ...state.windows,
          [id]: { ...win, isMinimized: false, zIndex: state.nextZIndex },
        },
        activeWindowId: id,
        nextZIndex: state.nextZIndex + 1,
      };
    }),

  minimizeWindow: (id) =>
    set((state) => {
      const win = state.windows[id];
      if (!win || win.isMinimized) return state;

      const windows = {
        ...state.windows,
        [id]: { ...win, isMinimized: true },
      };

      const activeWindowId =
        state.activeWindowId === id ? (topmostVisibleWindow(windows)?.id ?? null) : state.activeWindowId;

      return { windows, activeWindowId };
    }),

  toggleMaximize: (id, workArea) =>
    set((state) => {
      const win = state.windows[id];
      if (!win) return state;

      let updated: WindowState;
      if (win.isMaximized) {
        const previous = win.previousBounds;
        updated = {
          ...win,
          isMaximized: false,
          position: previous?.position ?? win.position,
          size: previous?.size ?? win.size,
          previousBounds: null,
        };
      } else {
        updated = {
          ...win,
          isMaximized: true,
          previousBounds: { position: win.position, size: win.size },
          position: { x: 0, y: 0 },
          size: { width: workArea.width, height: workArea.height },
        };
      }

      return {
        windows: { ...state.windows, [id]: updated },
        activeWindowId: id,
        nextZIndex: state.nextZIndex + 1,
      };
    }),

  moveWindow: (id, position) =>
    set((state) => {
      const win = state.windows[id];
      if (!win || win.isMaximized) return state;
      return {
        windows: { ...state.windows, [id]: { ...win, position } },
      };
    }),

  resizeWindow: (id, size) =>
    set((state) => {
      const win = state.windows[id];
      if (!win || win.isMaximized) return state;
      return {
        windows: { ...state.windows, [id]: { ...win, size } },
      };
    }),
}));
