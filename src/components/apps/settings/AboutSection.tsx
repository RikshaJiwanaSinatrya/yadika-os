import { LogoMark } from '../../icons/icons';
import { SectionHeader } from './SectionHeader';
import { useWindowStore } from '../../../store/windowStore';

function detectBrowser(userAgent: string): string {
  if (userAgent.includes('Edg/')) return 'Microsoft Edge';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('Safari/')) return 'Safari';
  return 'Unknown browser';
}

export function AboutSection() {
  const openWindows = useWindowStore((s) => Object.keys(s.windows).length);

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Version', value: '0.2.0 — Phase 2' },
    { label: 'Browser', value: detectBrowser(navigator.userAgent) },
    { label: 'Resolution', value: `${window.innerWidth} × ${window.innerHeight}` },
    { label: 'Language', value: navigator.language },
    { label: 'Time zone', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { label: 'Open windows', value: String(openWindows) },
  ];

  return (
    <>
      <SectionHeader title="About" description="System information about this web OS." />

      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
        <LogoMark className="h-10 w-10" />
        <div>
          <p className="text-sm font-semibold text-white">Yadika OS</p>
          <p className="text-xs text-slate-500">A desktop that lives in your browser.</p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-white/5 rounded-xl border border-white/10">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-xs text-slate-500">{row.label}</dt>
            <dd className="text-xs tabular-nums text-slate-200">{row.value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
