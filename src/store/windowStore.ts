import { create } from 'zustand';
import { APP_REGISTRY } from '../apps/registry';
import {
  BASE_Z_INDEX,
  TASKBAR_HEIGHT,
  WINDOW_CASCADE_OFFSET,
} from '../lib/constants';
import type {
  WindowBounds,
  WindowPosition,
  WindowSize,
  WindowSnap,
  WindowState,
  WorkArea,
} from '../types/window';

export interface OpenWindowOptions {
  /** Override the default window title (e.g. file name for the editor). */
  title?: string;
  /** App launch parameters; windows with identical params are reused. */
  params?: Record<string, string>;
}

interface WindowStore {
  windows: Record<string, WindowState>;
  activeWindowId: string | null;
  nextZIndex: number;
  openWindow: (appId: string, options?: OpenWindowOptions) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string, workArea: WorkArea) => void;
  snapWindow: (id: string, snap: Exclude<WindowSnap, null>, workArea: WorkArea) => void;
  moveWindow: (id: string, position: WindowPosition) => void;
  resizeWindow: (id: string, size: WindowSize) => void;
  setWindowTitle: (id: string, title: string) => void;
}

function sameParams(
  a: Record<string, string> | undefined,
  b: Record<string, string> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => a[key] === b[key]);
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

/** Bounds a window occupies when snapped to the given region of a work area. */
function boundsForSnap(
  snap: Exclude<WindowSnap, null>,
  workArea: WorkArea,
): WindowBounds {
  const gap = 6;
  if (snap === 'full') {
    return { position: { x: 0, y: 0 }, size: workArea };
  }
  const halfWidth = workArea.width / 2;
  if (snap === 'left') {
    return {
      position: { x: 0, y: gap },
      size: { width: halfWidth - gap, height: workArea.height - gap },
    };
  }
  return {
    position: { x: halfWidth + gap / 2, y: gap },
    size: { width: halfWidth - gap, height: workArea.height - gap },
  };
}

/** The bounds to restore once a window leaves its snapped/maximized state. */
function restoreBounds(win: WindowState): WindowBounds {
  return (
    win.previousBounds ?? {
      position: { x: 40, y: 40 },
      size: { width: win.size.width, height: win.size.height },
    }
  );
}

function createWindowState(
  appId: string,
  cascadeIndex: number,
  zIndex: number,
  options?: OpenWindowOptions,
): WindowState | null {
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
    title: options?.title ?? app.title,
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex,
    position,
    size: { width, height },
    previousBounds: null,
    snap: null,
    params: options?.params ? { ...options.params } : undefined,
  };
}

export const useWindowStore = create<WindowStore>((set) => ({
  windows: {},
  activeWindowId: null,
  nextZIndex: BASE_Z_INDEX,

  openWindow: (appId, options) =>
    set((state) => {
      if (!APP_REGISTRY[appId]) return state;

      // Re-opening with the same launch params focuses the existing window;
      // different params (e.g. another file in the editor) spawn a new one.
      const existing = Object.values(state.windows).find(
        (win) => win.appId === appId && sameParams(win.params, options?.params),
      );
      if (existing && !options?.title) {
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
      if (existing && options?.title) {
        return {
          windows: {
            ...state.windows,
            [existing.id]: { ...existing, title: options.title },
          },
          activeWindowId: existing.id,
          nextZIndex: state.nextZIndex + 1,
        };
      }

      const win = createWindowState(
        appId,
        Object.keys(state.windows).length,
        state.nextZIndex,
        options,
      );
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
      if (win.isMaximized || win.snap === 'full') {
        const bounds = restoreBounds(win);
        updated = {
          ...win,
          isMaximized: false,
          snap: null,
          previousBounds: null,
          position: bounds.position,
          size: bounds.size,
        };
      } else {
        updated = {
          ...win,
          isMaximized: true,
          snap: 'full',
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

  snapWindow: (id, snap, workArea) =>
    set((state) => {
      const win = state.windows[id];
      if (!win) return state;

      const isFull = snap === 'full';
      const leaving =
        win.snap === snap || (win.isMaximized && isFull) || (win.snap === 'full' && isFull);

      let updated: WindowState;
      if (leaving) {
        const bounds = restoreBounds(win);
        updated = {
          ...win,
          isMaximized: false,
          snap: null,
          previousBounds: null,
          position: bounds.position,
          size: bounds.size,
        };
      } else {
        const bounds = boundsForSnap(snap, workArea);
        updated = {
          ...win,
          isMaximized: snap === 'full',
          snap,
          previousBounds: win.previousBounds ?? {
            position: win.position,
            size: win.size,
          },
          position: bounds.position,
          size: bounds.size,
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
      // Dragging a snapped window away restores its prior free-form bounds.
      const updated: WindowState =
        win.snap !== null
          ? { ...win, snap: null, isMaximized: false, position }
          : { ...win, position };
      return {
        windows: { ...state.windows, [id]: updated },
      };
    }),

  resizeWindow: (id, size) =>
    set((state) => {
      const win = state.windows[id];
      if (!win || win.isMaximized) return state;
      const updated: WindowState =
        win.snap !== null
          ? { ...win, snap: null, isMaximized: false, size }
          : { ...win, size };
      return {
        windows: { ...state.windows, [id]: updated },
      };
    }),

  setWindowTitle: (id, title) =>
    set((state) => {
      const win = state.windows[id];
      if (!win || win.title === title) return state;
      return {
        windows: { ...state.windows, [id]: { ...win, title } },
      };
    }),
}));
