import { APP_REGISTRY } from '../../apps/registry';

/**
 * Temporary surface shown for apps that have no real UI yet (Phase 1).
 * Real apps registered with a `component` render instead of this.
 */
export function PlaceholderContent({ appId }: { appId: string }) {
  const app = APP_REGISTRY[appId];
  if (!app) return null;
  const AppIcon = app.icon;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5">
        <AppIcon className="h-7 w-7 text-cyan-300/80" />
      </span>
      <p className="text-sm font-medium text-slate-200">{app.title}</p>
      <p className="max-w-56 text-xs leading-relaxed text-slate-500">
        Placeholder — aplikasi nyata akan hadir di phase berikutnya.
      </p>
    </div>
  );
}
