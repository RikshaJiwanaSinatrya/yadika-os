import { useState } from 'react';
import { StartMenu } from './StartMenu';
import { TaskbarClock } from './TaskbarClock';
import { BatteryIcon, LogoMark, VolumeIcon, WifiIcon } from '../icons/icons';
import { APP_REGISTRY } from '../../apps/registry';
import { useWindowStore } from '../../store/windowStore';

export function Taskbar() {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const windows = useWindowStore((s) => s.windows);
  const activeWindowId = useWindowStore((s) => s.activeWindowId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);

  const openWindows = Object.values(windows);

  /** Active → minimize · minimized or background → restore & focus. */
  const handleTaskClick = (id: string) => {
    if (activeWindowId === id && !windows[id]?.isMinimized) {
      minimizeWindow(id);
    } else {
      focusWindow(id);
    }
  };

  return (
    <footer className="relative z-10 shrink-0 border-t border-white/10 bg-slate-950/80 backdrop-blur-2xl">
      <div className="flex h-12 items-center gap-2 px-2">
        <button
          type="button"
          aria-label={isStartOpen ? 'Close start menu' : 'Open start menu'}
          aria-expanded={isStartOpen}
          onClick={() => setIsStartOpen((open) => !open)}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300/70 ${
            isStartOpen ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          <LogoMark className="h-5 w-5" />
        </button>

        <span className="h-6 w-px shrink-0 bg-white/10" aria-hidden="true" />

        <ul className="os-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {openWindows.map((win) => (
            <li key={win.id} className="shrink-0">
              <button
                type="button"
                onClick={() => handleTaskClick(win.id)}
                title={win.title}
                className={`flex h-9 max-w-40 items-center gap-2 rounded-lg border px-3 text-xs transition-colors ${
                  win.isMinimized
                    ? 'border-transparent text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    : activeWindowId === win.id
                      ? 'border-white/15 bg-white/15 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <TaskIcon appId={win.appId} />
                <span className="truncate">{win.title}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-3 pl-2 text-slate-400">
          <WifiIcon className="h-4 w-4" />
          <VolumeIcon className="h-4 w-4" />
          <BatteryIcon className="h-4 w-4" />
          <TaskbarClock />
        </div>
      </div>

      <StartMenu open={isStartOpen} onClose={() => setIsStartOpen(false)} />
    </footer>
  );
}

function TaskIcon({ appId }: { appId: string }) {
  const AppIcon = APP_REGISTRY[appId]?.icon;
  if (!AppIcon) return null;
  return <AppIcon className="h-4 w-4 shrink-0 text-cyan-300/80" />;
}
