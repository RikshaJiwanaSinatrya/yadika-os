import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  CheckIcon,
  RefreshIcon,
  WifiIcon,
  LoaderIcon,
} from '../../icons/icons';
import {
  connectWifi,
  disconnectWifi,
  fetchWifiStatus,
  type WifiNetwork,
} from '../../../lib/networkApi';

function signalLevel(signal: number): number {
  if (signal >= 75) return 4;
  if (signal >= 50) return 3;
  if (signal >= 25) return 2;
  return 1;
}

export function WifiTray() {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [connectedSsid, setConnectedSsid] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busySsid, setBusySsid] = useState<string | null>(null);
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const status = await fetchWifiStatus();
      setNetworks(status.networks);
      setConnectedSsid(status.connectedSsid);
      setMock(status.mock);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setNetworks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchWifiStatus().then(
      (status) => {
        if (cancelled) return;
        setNetworks(status.networks);
        setConnectedSsid(status.connectedSsid);
        setMock(status.mock);
      },
      (reason) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setNetworks([]);
      },
    ).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (passwordFor !== null) passwordInputRef.current?.focus();
  }, [passwordFor]);

  const isConnected = (ssid: string) => ssid === connectedSsid;

  const handleConnect = async (network: WifiNetwork) => {
    if (busySsid) return;
    if (network.secured && passwordFor !== network.ssid) {
      setPasswordFor(network.ssid);
      setPassword('');
      setError(null);
      return;
    }
    if (isConnected(network.ssid)) return;

    setBusySsid(network.ssid);
    setError(null);
    try {
      const result = await connectWifi(network.ssid, network.secured ? password : '');
      setConnectedSsid(result.ssid);
      setPasswordFor(null);
      setPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusySsid(null);
    }
  };

  const handleDisconnect = async () => {
    if (!connectedSsid || busySsid) return;
    setBusySsid(connectedSsid);
    setError(null);
    try {
      await disconnectWifi(connectedSsid);
      setConnectedSsid(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusySsid(null);
    }
  };

  const handlePasswordSubmit = (event: FormEvent, network: WifiNetwork) => {
    event.preventDefault();
    void handleConnect(network);
  };

  return (
    <div className="w-72 p-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium text-slate-200">Wi-Fi</span>
        <div className="flex items-center gap-1">
          {mock && (
            <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] lowercase text-amber-300">
              demo
            </span>
          )}
          <button
            type="button"
            aria-label="Rescan networks"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {connectedSsid && (
        <div className="mx-1 mb-1 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <WifiIcon className="h-4 w-4 shrink-0 text-cyan-300/80" />
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-100">{connectedSsid}</p>
              <p className="text-[10px] text-slate-500">Connected</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            disabled={busySsid !== null}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            {busySsid === connectedSsid ? '…' : 'Disconnect'}
          </button>
        </div>
      )}

      <ul className="os-scroll max-h-64 space-y-0.5 overflow-y-auto px-1 pb-1">
        {loading && networks.length === 0 && (
          <li className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
            <LoaderIcon className="h-4 w-4 animate-spin text-slate-400" />
            Scanning…
          </li>
        )}
        {networks.map((network) => (
          <li key={network.ssid}>
            {passwordFor === network.ssid && !isConnected(network.ssid) && (
              <form
                onSubmit={(event) => handlePasswordSubmit(event, network)}
                className="mb-0.5 flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1"
              >
                <input
                  ref={passwordInputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
                />
                <button
                  type="submit"
                  disabled={!password || busySsid === network.ssid}
                  className="text-[10px] font-medium text-cyan-200 disabled:opacity-40"
                >
                  {busySsid === network.ssid ? '…' : 'Join'}
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordFor(null)}
                  aria-label="Cancel"
                  className="text-[10px] text-slate-500 hover:text-slate-200"
                >
                  ✕
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => void handleConnect(network)}
              disabled={busySsid !== null || isConnected(network.ssid)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors disabled:opacity-60 ${
                isConnected(network.ssid) ? 'bg-cyan-400/10' : 'hover:bg-white/5'
              }`}
            >
              <SignalBars level={signalLevel(network.signal)} active={isConnected(network.ssid)} />
              <span
                className={`min-w-0 flex-1 truncate text-xs ${
                  isConnected(network.ssid) ? 'text-cyan-100' : 'text-slate-200'
                }`}
              >
                {network.ssid}
              </span>
              {isConnected(network.ssid) ? (
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-cyan-300/80" />
              ) : busySsid === network.ssid ? (
                <LoaderIcon className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />
              ) : network.secured ? (
                <LockGlyph />
              ) : null}
            </button>
          </li>
        ))}
        {!loading && networks.length === 0 && (
          <li className="py-6 text-center text-xs text-slate-500">No networks found.</li>
        )}
      </ul>

      {error && (
        <p className="mx-1 mb-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] text-red-300">{error}</p>
      )}
    </div>
  );
}

function SignalBars({ level, active }: { level: number; active: boolean }) {
  const color = active ? 'bg-cyan-300/80' : 'bg-slate-500';
  const bars = [1, 2, 3, 4].map((i) => (
    <span key={i} className={`block w-1 rounded-sm ${i <= level ? color : 'bg-slate-700'}`} />
  ));
  return (
    <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
      {bars}
    </span>
  );
}

function LockGlyph() {
  return (
    <span className="grid h-3.5 w-3.5 shrink-0 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-slate-500">
        <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      </svg>
    </span>
  );
}
