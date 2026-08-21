import { useState } from 'react';
import { WindowHeader } from './WindowHeader';
import { PlaceholderContent } from './PlaceholderContent';
import { useWindowStore } from '../../store/windowStore';
import { useWindowResize } from '../../hooks/useWindowInteractions';
import { APP_REGISTRY } from '../../apps/registry';
import type { WindowState } from '../../types/window';

const CLOSE_ANIMATION_MS = 140;

interface WindowProps {
  win: WindowState;
}

export function Window({ win }: WindowProps) {
  const activeWindowId = useWindowStore((s) => s.activeWindowId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const [isClosing, setIsClosing] = useState(false);
  const resizeHandlers = useWindowResize(win);

  const app = APP_REGISTRY[win.appId];
  const AppContent = app?.component;
  const isActive = activeWindowId === win.id;
  const isHidden = win.isMinimized || isClosing;

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => closeWindow(win.id), CLOSE_ANIMATION_MS);
  };

  return (
    <section
      role="dialog"
      aria-label={win.title}
      onPointerDown={() => focusWindow(win.id)}
      style={{
        left: win.position.x,
        top: win.position.y,
        width: win.size.width,
        height: win.size.height,
        zIndex: win.zIndex,
      }}
      className={`window-pop-in absolute flex flex-col overflow-hidden rounded-xl border bg-slate-950/80 shadow-2xl backdrop-blur-xl transition-[opacity,transform] duration-150 ease-out ${
        isHidden
          ? 'pointer-events-none translate-y-10 scale-95 opacity-0'
          : 'translate-y-0 scale-100 opacity-100'
      } ${isActive ? 'border-white/20 shadow-black/60' : 'border-white/10 shadow-black/40'}`}
    >
      <WindowHeader win={win} onClose={handleClose} />

      <div className="min-h-0 flex-1 overflow-hidden">
        {AppContent ? <AppContent /> : <PlaceholderContent appId={win.appId} />}
      </div>

      {!win.isMaximized && (
        <div
          {...resizeHandlers}
          aria-hidden="true"
          className="absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize touch-none"
        />
      )}
    </section>
  );
}
