import { detectStorageBackend, readFile, removePath, writeFile } from './fsApi';
import type { StateStorage } from 'zustand/middleware';

const WRITE_DEBOUNCE_MS = 400;

const pendingWrites = new Map<string, string>();
const timers = new Map<string, number>();

function fileForKey(key: string): string {
  return `${key}.json`;
}

function flushKey(key: string): void {
  window.clearTimeout(timers.get(key));
  timers.delete(key);
  const content = pendingWrites.get(key);
  if (content === undefined) return;
  pendingWrites.delete(key);
  writeFile(fileForKey(key), content).catch(() => {
    // The localStorage mirror already holds this value; retry on next change.
  });
}

function flushAllWithBeacon(): void {
  for (const [key, content] of pendingWrites) {
    const payload = JSON.stringify({ path: fileForKey(key), content });
    navigator.sendBeacon('/api/fs/write', new Blob([payload], { type: 'application/json' }));
    pendingWrites.delete(key);
    window.clearTimeout(timers.get(key));
    timers.delete(key);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAllWithBeacon);
}

/**
 * Zustand `StateStorage` that persists state as JSON files in the server data
 * dir, mirroring every write to localStorage. If the FS API is unavailable the
 * mirror becomes the primary store (plain localStorage behaviour).
 */
export const osStorage: StateStorage = {
  getItem: async (name) => {
    if ((await detectStorageBackend()) === 'fs') {
      try {
        return await readFile(fileForKey(name));
      } catch {
        // fall through to the local mirror
      }
    }
    return localStorage.getItem(name);
  },

  setItem: async (name, value) => {
    localStorage.setItem(name, value);
    if ((await detectStorageBackend()) === 'local') return;
    pendingWrites.set(name, value);
    window.clearTimeout(timers.get(name));
    timers.set(name, window.setTimeout(() => flushKey(name), WRITE_DEBOUNCE_MS));
  },

  removeItem: async (name) => {
    localStorage.removeItem(name);
    window.clearTimeout(timers.get(name));
    timers.delete(name);
    pendingWrites.delete(name);
    if ((await detectStorageBackend()) === 'fs') {
      removePath(fileForKey(name)).catch(() => undefined);
    }
  },
};
