import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const API_PREFIX = '/api/network/';

const MOCK_NETWORKS = [
  { ssid: 'yadika-guest', secured: false, signal: 88, frequency: '2.4 GHz' },
  { ssid: 'YadikaNet', secured: true, signal: 76, frequency: '5 GHz' },
  { ssid: 'RumahWifi', secured: true, signal: 64, frequency: '2.4 GHz' },
  { ssid: 'Lab-ICT', secured: true, signal: 51, frequency: '5 GHz' },
  { ssid: 'Kantin 2.4', secured: false, signal: 33, frequency: '2.4 GHz' },
];

const MOCK_CONNECTED_SSID = 'YadikaNet';

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function parseSignal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  // nmcli reports signal in dBm (negative); a raw percentage may also appear.
  if (n <= 0) {
    const clipped = Math.max(-100, Math.min(n, -30));
    return Math.round(((clipped + 100) / 70) * 100);
  }
  return Math.min(100, Math.max(0, n));
}

/** True when nmcli exists on the host (real NetworkManager provisioning). */
async function nmcliAvailable() {
  try {
    await execFileAsync('nmcli', ['--version']);
    return true;
  } catch {
    return false;
  }
}

async function scanNetworks() {
  if (!(await nmcliAvailable())) return { networks: MOCK_NETWORKS, mock: true };

  try {
    const { stdout } = await execFileAsync(
      'nmcli',
      ['-t', '-f', 'IN-USE,SSID,SECURITY,SIGNAL,FREQ', 'device', 'wifi', 'list'],
      { timeout: 8000 },
    );
    const seen = new Set();
    const networks = [];
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      const [inUse, ssid, security, signal, frequency] = line.split(':');
      if (!ssid || seen.has(ssid)) continue;
      seen.add(ssid);
      networks.push({
        ssid,
        secured: Boolean(security && security !== '--' && security !== 'WPA1'),
        signal: parseSignal(signal),
        frequency: frequency || '',
        active: inUse === '*',
      });
    }
    return { networks, mock: false };
  } catch {
    return { networks: MOCK_NETWORKS, mock: true };
  }
}

async function currentConnection() {
  if (!(await nmcliAvailable())) return { ssid: MOCK_CONNECTED_SSID, mock: true };
  try {
    const { stdout } = await execFileAsync(
      'nmcli',
      ['-t', '-f', 'ACTIVE,SSID', 'connection', 'show', '--active'],
      { timeout: 5000 },
    );
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      const [active, ssid] = line.split(':');
      if (active === 'yes' && ssid) return { ssid, mock: false };
    }
  } catch {
    /* fall through */
  }
  return { ssid: null, mock: false };
}

async function connectNetwork(body) {
  const ssid = (body.ssid ?? '').toString();
  if (!ssid) throw new Error('Missing ssid');
  const password = (body.password ?? '').toString();
  if (!(await nmcliAvailable())) return { connected: true, ssid, mock: true };
  const args = ['device', 'wifi', 'connect', ssid];
  if (password) args.push('password', password);
  try {
    const { stdout } = await execFileAsync('nmcli', args, { timeout: 20000 });
    return { connected: true, ssid, detail: stdout.trim(), mock: false };
  } catch (error) {
    throw new Error(error?.stderr?.trim() || 'Failed to connect to network');
  }
}

async function disconnectNetwork(ssid) {
  if (!(await nmcliAvailable())) return { disconnected: true, ssid, mock: true };
  try {
    await execFileAsync('nmcli', ['connection', 'down', ssid], { timeout: 10000 });
    return { disconnected: true, ssid, mock: false };
  } catch (error) {
    throw new Error(error?.stderr?.trim() || 'Failed to disconnect');
  }
}

function readBody(req) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        const parsed = JSON.parse(raw || '{}');
        resolvePromise(typeof parsed === 'object' && parsed !== null ? parsed : {});
      } catch {
        resolvePromise({});
      }
    });
  });
}

export async function handleNetworkApi(req, res, url) {
  if (!url.pathname.startsWith(API_PREFIX)) return false;
  const action = url.pathname.slice(API_PREFIX.length);

  try {
    if (req.method === 'GET' && action === 'status') {
      const [status, conn] = await Promise.all([scanNetworks(), currentConnection()]);
      sendJson(res, 200, {
        connected: Boolean(conn.ssid),
        connectedSsid: conn.ssid,
        mock: status.mock || conn.mock,
        networks: status.networks,
      });
      return true;
    }

    if (req.method === 'POST' && action === 'connect') {
      const result = await connectNetwork(await readBody(req));
      sendJson(res, 200, result);
      return true;
    }

    if (req.method === 'POST' && action === 'disconnect') {
      const body = await readBody(req);
      const result = await disconnectNetwork((body.ssid ?? '').toString());
      sendJson(res, 200, result);
      return true;
    }

    sendJson(res, 404, { error: `Unknown network action: ${action}` });
    return true;
  } catch (error) {
    sendJson(res, 400, { error: error?.message || 'Network operation failed' });
    return true;
  }
}
