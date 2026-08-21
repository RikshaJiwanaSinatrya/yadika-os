import { CheckIcon } from '../../icons/icons';
import { SectionHeader } from './SectionHeader';
import { WALLPAPERS } from '../../../lib/wallpapers';
import { useSettingsStore } from '../../../store/settingsStore';

export function AppearanceSection() {
  const wallpaperId = useSettingsStore((s) => s.wallpaperId);
  const setWallpaperId = useSettingsStore((s) => s.setWallpaperId);

  return (
    <>
      <SectionHeader
        title="Wallpaper"
        description="Pick the background for your desktop. Changes apply instantly and are remembered."
      />

      <div role="radiogroup" aria-label="Wallpaper" className="grid grid-cols-3 gap-3">
        {WALLPAPERS.map((wallpaper) => {
          const isSelected = wallpaper.id === wallpaperId;
          return (
            <button
              key={wallpaper.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setWallpaperId(wallpaper.id)}
              className="group text-left focus-visible:outline-none"
            >
              <span
                className={`relative block overflow-hidden rounded-lg border transition ${
                  isSelected
                    ? 'border-cyan-300/70 ring-2 ring-cyan-300/50'
                    : 'border-white/10 group-hover:border-white/25'
                }`}
              >
                <img src={wallpaper.url} alt="" className="aspect-video w-full object-cover" />
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 grid h-4.5 w-4.5 place-items-center rounded-full bg-cyan-400 text-slate-950">
                    <CheckIcon className="h-3 w-3" strokeWidth={2.4} />
                  </span>
                )}
              </span>
              <span
                className={`mt-1.5 block text-xs ${isSelected ? 'text-cyan-200' : 'text-slate-400'}`}
              >
                {wallpaper.name}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
