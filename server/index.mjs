import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import pty from 'node-pty';
import { handleFsApi, initDataDir } from './fs-api.mjs';
import { handleNetworkApi } from './network-api.mjs';

const PORT = Number(process.env.PTY_PORT ?? process.env.PORT) || 3001;
const TERMINAL_PATH = '/pty';

const DIST_DIR = resolve('dist');
const HAS_CLIENT_BUILD = existsSync(join(DIST_DIR, 'index.html'));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function detectShell() {
  if (process.env.SHELL && process.env.SHELL.length > 0) return process.env.SHELL;
  for (const shell of ['/bin/bash', '/bin/sh']) {
    const result = spawnSync('test', ['-x', shell]);
    if (result.status === 0) return shell;
  }
  return '/bin/sh';
}

function sendFile(res, filePath) {
  const type = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(filePath).pipe(res);
}

async function handleRequest(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (await handleFsApi(req, res, url)) return;
  if (await handleNetworkApi(req, res, url)) return;

  if (!HAS_CLIENT_BUILD) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Terminal backend is running. Run `npm run build` to serve the client here too.');
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  const filePath = normalize(join(DIST_DIR, pathname));
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }

  sendFile(res, join(DIST_DIR, 'index.html'));
}

const server = http.createServer(handleRequest);

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url ?? '/', `http://${request.headers.host}`);
  if (pathname !== TERMINAL_PATH) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
});

wss.on('connection', (ws) => {
  const shell = detectShell();
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: homedir(),
    env: { ...process.env, TERM: 'xterm-256color' },
  });

  console.log(`[pty] session started (${shell}, pid ${ptyProcess.pid})`);

  ptyProcess.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'data', data }));
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', exitCode }));
      ws.close();
    }
  });

  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === 'input' && typeof message.data === 'string') {
      ptyProcess.write(message.data);
    } else if (message.type === 'resize') {
      const cols = Math.floor(Number(message.cols));
      const rows = Math.floor(Number(message.rows));
      if (Number.isFinite(cols) && Number.isFinite(rows) && cols > 0 && rows > 0) {
        ptyProcess.resize(cols, rows);
      }
    }
  });

  ws.on('close', () => {
    console.log(`[pty] session ended (pid ${ptyProcess.pid})`);
    ptyProcess.kill();
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[yadika] Port ${PORT} sudah dipakai proses lain.\n` +
        `         Matikan prosesnya: fuser -k ${PORT}/tcp\n` +
        `         Atau pakai port lain: PORT=${PORT + 1} npm start`,
    );
    process.exit(1);
  }
  throw error;
});

initDataDir().catch((error) => {
  console.error(`[yadika] FS API disabled — cannot init data dir: ${error.message}`);
});

server.listen(PORT, () => {
  const mode = HAS_CLIENT_BUILD ? 'backend + client (dist/)' : 'backend only';
  console.log(`[yadika] ${mode} listening on http://localhost:${PORT}`);
});
