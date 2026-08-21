import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchIcon } from '../icons/icons';
import { APP_LIST } from '../../apps/registry';
import { useWindowStore } from '../../store/windowStore';

interface StartMenuProps {
  open: boolean;
  onClose: () => void;
}

export function StartMenu({ open, onClose }: StartMenuProps) {
  const openWindow = useWindowStore((s) => s.openWindow);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return APP_LIST;
    return APP_LIST.filter((app) => app.title.toLowerCase().includes(normalized));
  }, [query]);

  /** Close and forget the current search so the next open starts clean. */
  const close = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const launchApp = (appId: string) => {
    openWindow(appId);
    close();
  };

  return (
    <>
      {/* Click-away layer: sits above the desktop but below the menu panel. */}
      {open && <div className="fixed inset-0 z-10" onPointerDown={close} aria-hidden="true" />}

      <div
        role="menu"
        aria-hidden={!open}
        className={`absolute bottom-full left-2 z-20 mb-2 w-80 origin-bottom-left rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl shadow-black/60 backdrop-blur-2xl transition-all duration-200 ease-out ${
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-95 opacity-0'
        }`}
      >
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-cyan-300/50">
          <SearchIcon className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps…"
            className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
          />
        </label>

        <ul className="os-scroll mt-3 max-h-72 space-y-1 overflow-y-auto">
          {results.map((app) => {
            const AppIcon = app.icon;
            return (
              <li key={app.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => launchApp(app.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300/70"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5">
                    <AppIcon className="h-4.5 w-4.5 text-cyan-300/80" />
                  </span>
                  <span className="text-sm text-slate-200">{app.title}</span>
                </button>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-slate-500">No apps found.</li>
          )}
        </ul>
      </div>
    </>
  );
}
