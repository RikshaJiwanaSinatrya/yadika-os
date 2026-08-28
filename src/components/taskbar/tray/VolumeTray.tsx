import { VolumeIcon, VolumeMuteIcon } from '../../icons/icons';
import { useSystemStore } from '../../../store/systemStore';

export function VolumeTray() {
  const volume = useSystemStore((s) => s.volume);
  const muted = useSystemStore((s) => s.muted);
  const setVolume = useSystemStore((s) => s.setVolume);
  const toggleMuted = useSystemStore((s) => s.toggleMuted);

  const displayed = muted ? 0 : volume;
  const percent = Math.round(displayed * 100);

  return (
    <div className="flex w-60 flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-200">Volume</span>
        <span className="text-[10px] tabular-nums text-slate-500">{percent}%</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={muted ? 'Unmute' : 'Mute'}
          onClick={toggleMuted}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {muted || volume === 0 ? (
            <VolumeMuteIcon className="h-5 w-5" />
          ) : (
            <VolumeIcon className="h-5 w-5" />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          value={percent}
          onChange={(event) => setVolume(Number(event.target.value) / 100)}
          aria-label="Volume slider"
          className="os-range min-w-0 flex-1"
        />
      </div>

      <p className="text-[10px] text-slate-600">System audio</p>
    </div>
  );
}
