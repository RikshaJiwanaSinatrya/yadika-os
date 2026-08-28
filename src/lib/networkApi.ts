export interface WifiNetwork {
  ssid: string;
  secured: boolean;
  signal: number;
  frequency?: string;
  active?: boolean;
}

export interface WifiStatus {
  connected: boolean;
  connectedSsid: string | null;
  mock: boolean;
  networks: WifiNetwork[];
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

export async function fetchWifiStatus(): Promise<WifiStatus> {
  return requestJson<WifiStatus>('/api/network/status');
}

export async function connectWifi(
  ssid: string,
  password?: string,
): Promise<{ connected: boolean; ssid: string; mock?: boolean }> {
  return requestJson('/api/network/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ssid, password: password ?? '' }),
  });
}

export async function disconnectWifi(
  ssid: string,
): Promise<{ disconnected: boolean; ssid: string; mock?: boolean }> {
  return requestJson('/api/network/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ssid }),
  });
}
