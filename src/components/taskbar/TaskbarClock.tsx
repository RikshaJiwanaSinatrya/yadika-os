import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';

export function TaskbarClock() {
  const clockFormat = useSettingsStore((s) => s.clockFormat);
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
      {now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: clockFormat === '12h',
      })}
    </time>
  );
}
