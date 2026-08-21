import { useEffect, useState } from 'react';
import { SectionHeader } from './SectionHeader';
import { useSettingsStore } from '../../../store/settingsStore';
import type { ClockFormat } from '../../../store/settingsStore';

const FORMAT_OPTIONS: Array<{ value: ClockFormat; label: string }> = [
  { value: '24h', label: '24-hour' },
  { value: '12h', label: '12-hour' },
];

export function DateTimeSection() {
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const setClockFormat = useSettingsStore((s) => s.setClockFormat);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <SectionHeader
        title="Date & Time"
        description="Choose how the taskbar clock displays time."
      />

      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] tracking-wider text-slate-500 uppercase">Preview</p>
        <p className="mt-1 text-3xl font-light tabular-nums text-white">
          {now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: clockFormat === '12h',
          })}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {now.toLocaleDateString([], {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium text-slate-300">Clock format</p>
        <div
          role="radiogroup"
          aria-label="Clock format"
          className="mt-2 inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5"
        >
          {FORMAT_OPTIONS.map((option) => {
            const isSelected = clockFormat === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setClockFormat(option.value)}
                className={`rounded-md px-3.5 py-1.5 text-xs transition-colors ${
                  isSelected ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
