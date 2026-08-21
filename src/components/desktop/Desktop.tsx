import wallpaperUrl from '../../assets/wallpaper-default.png';
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
      <main className="relative isolate min-h-0 flex-1 overflow-hidden bg-[#020617]">
        <img
          src={wallpaperUrl}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
        <WindowManager />
      </main>

      <Taskbar />
    </div>
  );
}
