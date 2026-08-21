import { Taskbar } from '../taskbar/Taskbar';
import { WindowManager } from '../window/WindowManager';

/**
 * Root OS surface: a fixed full-viewport wallpaper area that hosts the
 * window manager, with the taskbar docked at the bottom. `isolate` keeps
 * window z-indexes contained so the taskbar always stays on top.
 */
export function Desktop() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <main
        style={{
          backgroundImage: [
            'radial-gradient(60rem 40rem at 85% -10%, rgba(34, 211, 238, 0.16), transparent 60%)',
            'radial-gradient(50rem 35rem at -10% 110%, rgba(129, 140, 248, 0.18), transparent 60%)',
            'radial-gradient(40rem 30rem at 50% 120%, rgba(217, 70, 239, 0.1), transparent 65%)',
            'linear-gradient(160deg, #020617 0%, #0b1120 55%, #111827 100%)',
          ].join(', '),
        }}
        className="relative isolate min-h-0 flex-1 overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:44px_44px]"
        />
        <WindowManager />
      </main>

      <Taskbar />
    </div>
  );
}
