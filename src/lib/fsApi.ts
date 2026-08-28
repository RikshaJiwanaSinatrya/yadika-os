export interface FsEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
  mtimeMs: number;
}

interface FsListResponse {
  path: string;
  entries: FsEntry[];
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message =
      (payload as { error?: string } | null)?.error ?? `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

function post(action: string, body: Record<string, unknown>): Promise<unknown> {
  return requestJson(`/api/fs/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function withPath(action: string, path: string): string {
  return `/api/fs/${action}?path=${encodeURIComponent(path)}`;
}

/** Normalize a directory path to the canonical form used by the API ('/' root). */
export function joinPath(dir: string, name: string): string {
  return `${dir === '/' ? '' : dir}/${name}`;
}

export function parentPath(path: string): string {
  const index = path.lastIndexOf('/');
  if (index <= 0) return '/';
  return path.slice(0, index);
}

export function baseName(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export async function listDir(path = '/'): Promise<FsEntry[]> {
  const data = await requestJson<FsListResponse>(withPath('list', path));
  return data.entries;
}

export async function readFile(path: string): Promise<string> {
  const data = await requestJson<{ content: string }>(withPath('read', path));
  return data.content;
}

export async function writeFile(path: string, content: string): Promise<void> {
  await post('write', { path, content });
}

export async function makeDir(path: string): Promise<void> {
  await post('mkdir', { path });
}

export async function removePath(path: string): Promise<void> {
  await post('delete', { path });
}

export async function renamePath(from: string, to: string): Promise<void> {
  await post('rename', { from, to });
}

export async function copyPath(from: string, to: string): Promise<void> {
  await post('copy', { from, to });
}

/** Move a file/folder by renaming it to the destination. */
export async function movePath(from: string, to: string): Promise<void> {
  await renamePath(from, to);
}

export type StorageBackend = 'fs' | 'local';

let detectionPromise: Promise<StorageBackend> | null = null;

/**
 * Probe the FS API exactly once per page load. Everything that needs to know
 * which persistence layer is active awaits this single promise instead of
 * retrying failed requests.
 */
export function detectStorageBackend(): Promise<StorageBackend> {
  detectionPromise ??= requestJson<FsListResponse>(withPath('list', '/')).then(
    () => 'fs' as const,
    () => 'local' as const,
  );
  return detectionPromise;
}
