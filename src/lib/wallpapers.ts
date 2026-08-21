import monokromUrl from '../assets/wallpapers/monokrom.png';
import auroraUrl from '../assets/wallpapers/aurora.svg';
import midnightUrl from '../assets/wallpapers/midnight.svg';

export interface Wallpaper {
  id: string;
  name: string;
  url: string;
}

export const WALLPAPERS: Wallpaper[] = [
  { id: 'monokrom', name: 'Monokrom', url: monokromUrl },
  { id: 'aurora', name: 'Aurora', url: auroraUrl },
  { id: 'midnight', name: 'Midnight', url: midnightUrl },
];

export const DEFAULT_WALLPAPER_ID = WALLPAPERS[0].id;

export function getWallpaper(id: string): Wallpaper {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? WALLPAPERS[0];
}
