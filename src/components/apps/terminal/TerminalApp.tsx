import { useState } from 'react';
import { PtyTerminal } from './PtyTerminal';
import { FakeTerminal } from './FakeTerminal';

/**
 * Prefers a real shell through the PTY backend; falls back to the
 * built-in fake shell when the backend is unreachable (e.g. static
 * hosting without the server).
 */
export function TerminalApp() {
  const [mode, setMode] = useState<'pty' | 'fallback'>('pty');

  if (mode === 'fallback') return <FakeTerminal />;
  return <PtyTerminal onUnavailable={() => setMode('fallback')} />;
}
