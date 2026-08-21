import { useEffect, useState } from 'react';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TaskbarClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time
      dateTime={now.toISOString()}
      className="tabular-nums text-xs font-medium text-slate-300"
    >
      {formatTime(now)}
    </time>
  );
}
