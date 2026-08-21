import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { KITTY_THEME } from './kittyTheme';

interface PtyMessage {
  type: 'data' | 'exit';
  data?: string;
  exitCode?: number;
}

function terminalUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/pty`;
}

const CONNECT_TIMEOUT_MS = 2500;

export function PtyTerminal({ onUnavailable }: { onUnavailable: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onUnavailableRef = useRef(onUnavailable);

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      theme: KITTY_THEME,
      fontFamily:
        '"JetBrains Mono", "Fira Code", ui-monospace, "Cascadia Mono", "Source Code Pro", Menlo, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      scrollback: 5000,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    const socket = new WebSocket(terminalUrl());
    let opened = false;

    const connectTimer = window.setTimeout(() => {
      if (!opened) {
        socket.close();
        onUnavailableRef.current();
      }
    }, CONNECT_TIMEOUT_MS);

    socket.onopen = () => {
      opened = true;
      window.clearTimeout(connectTimer);
      term.focus();
      socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    socket.onerror = () => {
      if (!opened) {
        window.clearTimeout(connectTimer);
        onUnavailableRef.current();
      }
    };

    socket.onclose = () => {
      if (!opened) {
        window.clearTimeout(connectTimer);
        onUnavailableRef.current();
      }
    };

    socket.onmessage = (event) => {
      let message: PtyMessage;
      try {
        message = JSON.parse(event.data as string);
      } catch {
        return;
      }
      if (message.type === 'data' && typeof message.data === 'string') {
        term.write(message.data);
      } else if (message.type === 'exit') {
        term.write(
          `\r\n\x1b[90m[Session ended — close and reopen the Terminal app to start a new shell]\x1b[0m\r\n`,
        );
      }
    };

    const dataDisposable = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data }));
      }
    });

    const resizeDisposable = term.onResize(({ cols, rows }) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    const observer = new ResizeObserver(() => fitAddon.fit());
    observer.observe(container);

    return () => {
      window.clearTimeout(connectTimer);
      observer.disconnect();
      dataDisposable.dispose();
      resizeDisposable.dispose();
      socket.close();
      term.dispose();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full p-1.5" />;
}
