import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_WALLPAPER_ID } from '../lib/wallpapers';
import { osStorage } from '../lib/osStorage';

export type ClockFormat = '12h' | '24h';

interface SettingsState {
  wallpaperId: string;
  clockFormat: ClockFormat;
  setWallpaperId: (id: string) => void;
  setClockFormat: (format: ClockFormat) => void;
}

/**
 * User preferences. Persisted through the FS API as a JSON file in the data
 * dir when the backend is reachable, with localStorage as mirror/fallback.
 * Consumers must tolerate unknown stored ids (e.g. removed wallpapers)
 * by falling back at the usage site.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      wallpaperId: DEFAULT_WALLPAPER_ID,
      clockFormat: '24h',
      setWallpaperId: (wallpaperId) => set({ wallpaperId }),
      setClockFormat: (clockFormat) => set({ clockFormat }),
    }),
    {
      name: 'yadika-os-settings',
      storage: createJSONStorage(() => osStorage),
    },
  ),
);
