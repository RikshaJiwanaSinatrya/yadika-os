import { create } from 'zustand';

export interface WifiConnection {
  ssid: string;
  secured: boolean;
  connected: boolean;
}

interface SystemState {
  volume: number;
  muted: boolean;
  battery: { level: number; charging: boolean } | null;
  setVolume: (volume: number) => void;
  toggleMuted: () => void;
  setBattery: (battery: { level: number; charging: boolean } | null) => void;
}

/** Transient device state the system tray surfaces (volume, battery). */
export const useSystemStore = create<SystemState>((set) => ({
  volume: 0.7,
  muted: false,
  battery: null,
  setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
  toggleMuted: () => set((state) => ({ muted: !state.muted })),
  setBattery: (battery) => set({ battery }),
}));
