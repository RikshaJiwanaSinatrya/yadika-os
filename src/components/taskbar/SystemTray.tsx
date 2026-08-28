import { useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { BatteryIcon, VolumeIcon, VolumeMuteIcon, WifiIcon } from '../icons/icons';
import { useSystemStore } from '../../store/systemStore';
import { WifiTray } from './tray/WifiTray';
import { VolumeTray } from './tray/VolumeTray';
import { BatteryTray } from './tray/BatteryTray';

type TrayPanel = 'wifi' | 'volume' | 'battery' | null;

interface TrayItemConfig {
  id: Exclude<TrayPanel, null>;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  Panel: ComponentType;
}

export function SystemTray() {
  const [openPanel, setOpenPanel] = useState<TrayPanel>(null);
  const volume = useSystemStore((s) => s.volume);
  const muted = useSystemStore((s) => s.muted);
  const battery = useSystemStore((s) => s.battery);

  const batteryPercent = battery ? Math.round(battery.level * 100) : 92;

  const toggle = (id: Exclude<TrayPanel, null>) => {
    setOpenPanel((current) => (current === id ? null : id));
  };

  const items: TrayItemConfig[] = [
    { id: 'wifi', label: 'Wi-Fi', icon: WifiIcon, Panel: WifiTray },
    {
      id: 'volume',
      label: 'Volume',
      icon: muted || volume === 0 ? VolumeMuteIcon : VolumeIcon,
      Panel: VolumeTray,
    },
    { id: 'battery', label: 'Battery', icon: BatteryIcon, Panel: BatteryTray },
  ];

  return (
    <div className="relative flex shrink-0 items-center gap-1">
      {items.map(({ id, label, icon: Icon, Panel }) => {
        const isOpen = openPanel === id;
        return (
          <div key={id} className="relative flex items-center">
            <button
              type="button"
              aria-label={label}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              onClick={() => toggle(id)}
              title={id === 'battery' ? `${batteryPercent}% battery` : label}
              className={`grid h-8 w-9 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300/70 ${
                isOpen ? 'bg-white/15 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>

            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onPointerDown={() => setOpenPanel(null)}
                  aria-hidden="true"
                />
                <div
                  role="menu"
                  className="absolute bottom-full right-0 z-40 mb-2 origin-bottom-right rounded-2xl border border-white/10 bg-slate-950/95 p-1 shadow-2xl shadow-black/60 backdrop-blur-2xl transition-all duration-150"
                >
                  <Panel />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
