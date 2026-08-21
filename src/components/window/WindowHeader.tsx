import type { ReactNode } from 'react';
import { CloseIcon, MaximizeIcon, MinimizeIcon, RestoreIcon } from '../icons/icons';
import { useWindowStore } from '../../store/windowStore';
import { useWindowDrag } from '../../hooks/useWindowInteractions';
import { APP_REGISTRY } from '../../apps/registry';
import { TASKBAR_HEIGHT } from '../../lib/constants';
import type { WindowState } from '../../types/window';

interface WindowHeaderProps {
  win: WindowState;
  onClose: () => void;
}

function getWorkArea(): { width: number; height: number } {
  return { width: window.innerWidth, height: window.innerHeight - TASKBAR_HEIGHT };
}

export function WindowHeader({ win, onClose }: WindowHeaderProps) {
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const dragHandlers = useWindowDrag(win);
  const AppIcon = APP_REGISTRY[win.appId]?.icon;

  return (
    <header
      {...dragHandlers}
      onDoubleClick={() => toggleMaximize(win.id, getWorkArea())}
      className={`flex h-10 shrink-0 touch-none select-none items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 ${
        win.isMaximized ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      <span className="flex items-center gap-2 overflow-hidden">
        {AppIcon && <AppIcon className="h-4 w-4 shrink-0 text-cyan-300/80" />}
        <span className="truncate text-xs font-medium tracking-wide text-slate-200">
          {win.title}
        </span>
      </span>

      <div className="ml-auto flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <HeaderButton label="Minimize" onClick={() => minimizeWindow(win.id)}>
          <MinimizeIcon className="h-3.5 w-3.5" />
        </HeaderButton>
        <HeaderButton
          label={win.isMaximized ? 'Restore' : 'Maximize'}
          onClick={() => toggleMaximize(win.id, getWorkArea())}
        >
          {win.isMaximized ? (
            <RestoreIcon className="h-3.5 w-3.5" />
          ) : (
            <MaximizeIcon className="h-3.5 w-3.5" />
          )}
        </HeaderButton>
        <HeaderButton label="Close" danger onClick={onClose}>
          <CloseIcon className="h-3.5 w-3.5" />
        </HeaderButton>
      </div>
    </header>
  );
}

function HeaderButton({
  label,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300/70 ${
        danger ? 'hover:bg-red-500/80 hover:text-white' : ''
      }`}
    >
      {children}
    </button>
  );
}
