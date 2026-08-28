import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useWindowStore } from '../store/windowStore';
import {
  DRAG_VISIBLE_MARGIN,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  TASKBAR_HEIGHT,
} from '../lib/constants';
import type { WindowSnap, WindowState, WorkArea } from '../types/window';

interface DragSession {
  pointerX: number;
  pointerY: number;
  originX: number;
  originY: number;
  snapped: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getWorkArea(): WorkArea {
  return { width: window.innerWidth, height: window.innerHeight - TASKBAR_HEIGHT };
}

/** Snap zone suggested by pointer position during a drag (aero snap). */
function snapZoneForPointer(x: number, y: number): WindowSnap {
  const edge = 12;
  if (x <= edge) return 'left';
  if (x >= window.innerWidth - edge) return 'right';
  if (y <= edge) return 'full';
  return null;
}

/**
 * Shared pointer-capture logic for dragging a window by its header and
 * resizing it from its corner grip. Position/size live in the window store,
 * so every update keeps a single source of truth.
 */
function useWindowPointerSession(win: WindowState) {
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);
  const snapWindow = useWindowStore((s) => s.snapWindow);
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
        snapped: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [win.isMaximized, win.position.x, win.position.y],
  );

  const onDragMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = session.current;
      if (!start) return;

      // Aero snap: cross an edge while dragging to dock the window there.
      if (!start.snapped) {
        const zone = snapZoneForPointer(event.clientX, event.clientY);
        if (zone) {
          start.snapped = true;
          snapWindow(win.id, zone, getWorkArea());
          return;
        }
      } else {
        // Once snapped, a cursor re-entering the work area re-enables free drag.
        if (snapZoneForPointer(event.clientX, event.clientY) === null) {
          start.snapped = false;
          moveWindow(win.id, { x: event.clientX - start.pointerX, y: event.clientY - start.pointerY });
        }
        return;
      }

      const maxX = window.innerWidth - DRAG_VISIBLE_MARGIN;
      const minX = -(win.size.width - DRAG_VISIBLE_MARGIN);
      // Keep the header reachable above the taskbar.
      const maxY = window.innerHeight - TASKBAR_HEIGHT - DRAG_VISIBLE_MARGIN / 2;

      moveWindow(win.id, {
        x: clamp(start.originX + event.clientX - start.pointerX, minX, maxX),
        y: clamp(start.originY + event.clientY - start.pointerY, 0, maxY),
      });
    },
    [moveWindow, snapWindow, win.id, win.size.width],
  );

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (win.isMaximized || event.button !== 0) return;
      session.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        originX: win.size.width,
        originY: win.size.height,
        snapped: false,
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
