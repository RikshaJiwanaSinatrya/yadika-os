import { useEffect } from 'react';
import { BatteryChargingIcon, BatteryEmptyIcon } from '../../icons/icons';
import { useSystemStore } from '../../../store/systemStore';

export function BatteryTray() {
  const battery = useSystemStore((s) => s.battery);
  const setBattery = useSystemStore((s) => s.setBattery);

  useEffect(() => {
    type BatteryManager = {
      level: number;
      charging: boolean;
      addEventListener: (type: string, listener: () => void) => void;
    };
    const navigatorWithBattery = navigator as Navigator & {
      getBattery?: () => Promise<BatteryManager>;
    };
    if (!navigatorWithBattery.getBattery) {
      setBattery(null);
      return;
    }
    let cancelled = false;
    navigatorWithBattery.getBattery().then((manager) => {
      if (cancelled) return;
      const update = () => setBattery({ level: manager.level, charging: manager.charging });
      update();
      manager.addEventListener('levelchange', update);
      manager.addEventListener('chargingchange', update);
    });
    return () => {
      cancelled = true;
    };
  }, [setBattery]);

  const percent = battery ? Math.round(battery.level * 100) : 92;
  const low = percent <= 20;

  return (
    <div className="flex w-56 flex-col gap-3 p-3">
      <div className="flex items-center gap-3">
        {battery?.charging ? (
          <BatteryChargingIcon className="h-6 w-6 text-emerald-300/80" />
        ) : low ? (
          <BatteryEmptyIcon className="h-6 w-6 text-red-300/80" />
        ) : (
          <BatteryIconGlyph />
        )}
        <div className="min-w-0">
          <p className={`text-sm font-medium ${low ? 'text-red-200' : 'text-slate-100'}`}>
            {percent}%
          </p>
          <p className="text-[10px] text-slate-500">
            {battery?.charging ? 'Charging' : battery ? 'On battery' : 'Battery'}
          </p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${
            low ? 'bg-red-400/80' : 'bg-cyan-300/70'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function BatteryIconGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <rect x="2.5" y="8" width="17" height="8" rx="1.5" stroke="currentColor" strokeWidth={1.5} />
      <path d="M21.5 11v2" stroke="currentColor" strokeWidth={1.5} />
      <rect
        x="4.5"
        y="10"
        width="10"
        height="4"
        rx="0.5"
        fill="currentColor"
        stroke="none"
        className="text-cyan-300/70"
      />
    </svg>
  );
}
