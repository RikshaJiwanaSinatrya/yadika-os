import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useWindowStore } from '../store/windowStore';
import {
  DRAG_VISIBLE_MARGIN,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  TASKBAR_HEIGHT,
} from '../lib/constants';
import type { WindowState } from '../types/window';

interface DragSession {
  pointerX: number;
  pointerY: number;
  originX: number;
  originY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Shared pointer-capture logic for dragging a window by its header and
 * resizing it from its corner grip. Position/size live in the window store,
 * so every update keeps a single source of truth.
 */
function useWindowPointerSession(win: WindowState) {
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);
  const session = useRef<DragSession | null>(null);

  const endSession = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (session.current) {
      session.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (win.isMaximized || event.button !== 0) return;
      session.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        originX: win.position.x,
        originY: win.position.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [win.isMaximized, win.position.x, win.position.y],
  );

  const onDragMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = session.current;
      if (!start) return;

      const maxX = window.innerWidth - DRAG_VISIBLE_MARGIN;
      const minX = -(win.size.width - DRAG_VISIBLE_MARGIN);
      // Keep the header reachable above the taskbar.
      const maxY = window.innerHeight - TASKBAR_HEIGHT - DRAG_VISIBLE_MARGIN / 2;

      moveWindow(win.id, {
        x: clamp(start.originX + event.clientX - start.pointerX, minX, maxX),
        y: clamp(start.originY + event.clientY - start.pointerY, 0, maxY),
      });
    },
    [moveWindow, win.id, win.size.width],
  );

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (win.isMaximized || event.button !== 0) return;
      session.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        originX: win.size.width,
        originY: win.size.height,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [win.isMaximized, win.size.height, win.size.width],
  );

  const onResizeMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = session.current;
      if (!start) return;

      const maxWidth = window.innerWidth - win.position.x;
      const maxHeight = window.innerHeight - TASKBAR_HEIGHT - win.position.y;

      resizeWindow(win.id, {
        width: clamp(start.originX + event.clientX - start.pointerX, MIN_WINDOW_WIDTH, maxWidth),
        height: clamp(start.originY + event.clientY - start.pointerY, MIN_WINDOW_HEIGHT, maxHeight),
      });
    },
    [resizeWindow, win.id, win.position.x, win.position.y],
  );

  return { startDrag, onDragMove, startResize, onResizeMove, endSession };
}

/** Drag handlers for a window's title bar. */
export function useWindowDrag(win: WindowState) {
  const { startDrag, onDragMove, endSession } = useWindowPointerSession(win);
  return {
    onPointerDown: startDrag,
    onPointerMove: onDragMove,
    onPointerUp: endSession,
    onPointerCancel: endSession,
  };
}

/** Resize handlers for a window's corner grip. */
export function useWindowResize(win: WindowState) {
  const { startResize, onResizeMove, endSession } = useWindowPointerSession(win);
  return {
    onPointerDown: startResize,
    onPointerMove: onResizeMove,
    onPointerUp: endSession,
    onPointerCancel: endSession,
  };
}
