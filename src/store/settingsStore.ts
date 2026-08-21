import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_WALLPAPER_ID } from '../lib/wallpapers';

export type ClockFormat = '12h' | '24h';

interface SettingsState {
  wallpaperId: string;
  clockFormat: ClockFormat;
  setWallpaperId: (id: string) => void;
  setClockFormat: (format: ClockFormat) => void;
}

/**
 * User preferences, persisted to localStorage so they survive reloads.
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
    { name: 'nebula-os-settings' },
  ),
);
