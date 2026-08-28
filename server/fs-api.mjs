import { homedir } from 'node:os';
import { promises as fs } from 'node:fs';
import { basename, dirname, join, normalize, relative, resolve, sep } from 'node:path';

const API_PREFIX = '/api/fs/';
export const DATA_DIR = resolve(
  process.env.YADIKA_DATA_DIR ?? join(homedir(), 'yadika-data'),
);

const MAX_READ_BYTES = 2 * 1024 * 1024;
const MAX_WRITE_BYTES = 8 * 1024 * 1024;

let realDataDir = DATA_DIR;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function initDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  realDataDir = await fs.realpath(DATA_DIR);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolvePromise, rejectPromise) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_WRITE_BYTES) {
      rejectPromise(new HttpError(413, 'Payload too large'));
      req.resume();
      return;
    }

    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_WRITE_BYTES) {
        rejectPromise(new HttpError(413, 'Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rejectPromise);
  });
}

async function readJsonBody(req) {
  const raw = await readBody(req);
  if (raw.length === 0) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

/**
 * Resolve a sandbox-relative path to an absolute filesystem path.
 * Rejects traversal and any resolution (including symlinks) that escapes
 * the data directory. Symlink components are resolved and re-checked;
 * dangling symlinks are rejected outright so writes cannot follow them out.
 */
async function safeResolve(relPath) {
  if (typeof relPath !== 'string' || relPath.length > 4096 || relPath.includes('\0')) {
    throw new HttpError(400, 'Invalid path');
  }

  let rel = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (rel === '.' || rel === './') rel = '';

  const naiveTarget = normalize(join(realDataDir, rel));
  if (naiveTarget !== realDataDir && !naiveTarget.startsWith(realDataDir + sep)) {
    throw new HttpError(400, 'Path escapes the data directory');
  }

  const parts = relative(realDataDir, naiveTarget).split(sep).filter(Boolean);
  let resolved = realDataDir;
  for (const part of parts) {
    const next = normalize(join(resolved, part));
    let stats = null;
    try {
      stats = await fs.lstat(next);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (stats?.isSymbolicLink()) {
      let linkTarget;
      try {
        linkTarget = await fs.realpath(next);
      } catch {
        throw new HttpError(400, 'Invalid path (dangling symlink)');
      }
      assertInsideSandbox(linkTarget);
      resolved = linkTarget;
    } else {
      resolved = next;
    }
  }

  assertInsideSandbox(resolved);
  return resolved;
}

function assertInsideSandbox(target) {
  if (target !== realDataDir && !target.startsWith(realDataDir + sep)) {
    throw new HttpError(400, 'Path escapes the data directory');
  }
}

function requireNonRoot(relPath) {
  const cleaned = String(relPath ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (cleaned === '' || cleaned === '.') {
    throw new HttpError(400, 'Operation not allowed on the data dir root');
  }
}

function requireStringField(body, field) {
  const value = body[field];
  if (typeof value !== 'string') {
    throw new HttpError(400, `Missing or invalid field: ${field}`);
  }
  return value;
}

async function listEntry(target) {
  try {
    return await fs.stat(target);
  } catch {
    return null;
  }
}

/** Find a destination name that does not collide, appending " (copy)" as needed. */
async function availableTarget(target) {
  if ((await listEntry(target)) === null) return target;
  const base = basename(target);
  const dir = dirname(target);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  for (let i = 1; ; i++) {
    const candidate = join(dir, `${stem} (copy ${i})${ext}`);
    if ((await listEntry(candidate)) === null) return candidate;
  }
}

async function copyEntry(fromTarget, toTarget) {
  const stats = await listEntry(fromTarget);
  if (!stats) throw new HttpError(404, 'Source not found');
  if (stats.isDirectory()) {
    await fs.mkdir(toTarget, { recursive: true });
    const children = await fs.readdir(fromTarget);
    for (const child of children) {
      await copyEntry(join(fromTarget, child), join(toTarget, child));
    }
  } else {
    await fs.copyFile(fromTarget, toTarget);
  }
}


async function handleGet(req, res, action, searchParams) {
  const relPath = searchParams.get('path') ?? '/';
  const target = await safeResolve(relPath);

  if (action === 'list') {
    let dirents;
    try {
      dirents = await fs.readdir(target, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOTDIR') throw new HttpError(400, 'Not a directory');
      throw error;
    }

    const entries = [];
    for (const dirent of dirents) {
      const entryPath = join(target, dirent.name);
      const stats = await listEntry(entryPath);
      entries.push({
        name: dirent.name,
        type: stats?.isDirectory() ? 'directory' : 'file',
        size: stats?.isDirectory() ? 0 : (stats?.size ?? 0),
        mtimeMs: stats?.mtimeMs ?? 0,
      });
    }

    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    sendJson(res, 200, { path: relPath, entries });
    return true;
  }

  if (action === 'read') {
    const stats = await listEntry(target);
    if (!stats || stats.isDirectory()) throw new HttpError(404, 'File not found');
    if (stats.size > MAX_READ_BYTES) {
      throw new HttpError(413, `File exceeds ${MAX_READ_BYTES} byte read limit`);
    }
    const content = await fs.readFile(target, 'utf8');
    sendJson(res, 200, { path: relPath, content });
    return true;
  }

  return false;
}

async function handlePost(req, res, action) {
  const body = await readJsonBody(req);

  if (action === 'write') {
    const relPath = requireStringField(body, 'path');
    const content = requireStringField(body, 'content');
    if (Buffer.byteLength(content, 'utf8') > MAX_WRITE_BYTES) {
      throw new HttpError(413, `Content exceeds ${MAX_WRITE_BYTES} byte write limit`);
    }
    const target = await safeResolve(relPath);
    assertInsideSandbox(target);
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf8');
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (action === 'mkdir') {
    const relPath = requireStringField(body, 'path');
    requireNonRoot(relPath);
    const target = await safeResolve(relPath);
    assertInsideSandbox(target);
    try {
      await fs.mkdir(target, { recursive: false });
    } catch (error) {
      if (error.code === 'EEXIST') throw new HttpError(409, 'Already exists');
      if (error.code === 'ENOENT') throw new HttpError(400, 'Parent directory missing');
      throw error;
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (action === 'delete') {
    const relPath = requireStringField(body, 'path');
    requireNonRoot(relPath);
    const target = await safeResolve(relPath);
    assertInsideSandbox(target);
    try {
      await fs.rm(target, { recursive: true });
    } catch (error) {
      if (error.code === 'ENOENT') throw new HttpError(404, 'Not found');
      throw error;
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (action === 'rename') {
    const fromRel = requireStringField(body, 'from');
    const toRel = requireStringField(body, 'to');
    requireNonRoot(fromRel);
    requireNonRoot(toRel);
    const fromTarget = await safeResolve(fromRel);
    const toTarget = await safeResolve(toRel);
    assertInsideSandbox(fromTarget);
    assertInsideSandbox(toTarget);
    if ((await listEntry(toTarget)) !== null) {
      throw new HttpError(409, 'Destination already exists');
    }
    await fs.mkdir(dirname(toTarget), { recursive: true });
    try {
      await fs.rename(fromTarget, toTarget);
    } catch (error) {
      if (error.code === 'ENOENT') throw new HttpError(404, 'Source not found');
      throw error;
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (action === 'copy') {
    const fromRel = requireStringField(body, 'from');
    const toRel = requireStringField(body, 'to');
    requireNonRoot(fromRel);
    const fromTarget = await safeResolve(fromRel);
    const destination = await safeResolve(toRel);
    assertInsideSandbox(fromTarget);
    assertInsideSandbox(destination);
    if ((await listEntry(fromTarget)) === null) throw new HttpError(404, 'Source not found');
    const isDir = (await fs.stat(fromTarget)).isDirectory();
    const destStats = await listEntry(destination);
    // Copying into an existing directory nests the source under it by name.
    const toTarget =
      destStats && destStats.isDirectory()
        ? (await availableTarget(join(destination, basename(fromRel.replace(/\/$/, '')))))
        : (await availableTarget(destination));
    if (isDir) {
      await fs.mkdir(dirname(toTarget), { recursive: true });
    }
    await copyEntry(fromTarget, toTarget);
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}

/**
 * Router untuk /api/fs/*. Mengembalikan true jika request selesai ditangani
 * di sini, false jika URL bukan bagian dari API ini.
 */
export async function handleFsApi(req, res, url) {
  if (!url.pathname.startsWith(API_PREFIX)) return false;

  try {
    const action = url.pathname.slice(API_PREFIX.length);

    if (req.method === 'GET') {
      const handled = await handleGet(req, res, action, url.searchParams);
      if (handled) return true;
    } else if (req.method === 'POST') {
      const handled = await handlePost(req, res, action);
      if (handled) return true;
    } else {
      res.writeHead(405, { Allow: 'GET, POST' });
      res.end();
      return true;
    }

    sendJson(res, 404, { error: `Unknown FS API action: ${action}` });
    return true;
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(res, error.status, { error: error.message });
      return true;
    }
    console.error('[fs-api]', error);
    sendJson(res, 500, { error: 'Internal server error' });
    return true;
  }
}
