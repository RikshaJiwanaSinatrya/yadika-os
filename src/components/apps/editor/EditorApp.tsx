import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { SaveIcon } from '../../icons/icons';
import { baseName, joinPath, readFile, writeFile } from '../../../lib/fsApi';
import { useWindowStore } from '../../../store/windowStore';
import type { AppProps } from '../../../types/window';

export function EditorApp({ win }: AppProps) {
  const launchPath = win.params?.path ?? null;
  const setWindowTitle = useWindowStore((s) => s.setWindowTitle);

  const [currentPath, setCurrentPath] = useState<string | null>(launchPath);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [saveAsName, setSaveAsName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!launchPath) return;
    let cancelled = false;
    readFile(launchPath)
      .then((text) => {
        if (cancelled) return;
        setContent(text);
        setSavedContent(text);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
  }, [launchPath]);

  const isDirty = content !== savedContent;

  const save = useCallback(async () => {
    if (!currentPath) return;
    setBusy(true);
    setError(null);
    try {
      await writeFile(currentPath, content);
      setSavedContent(content);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }, [content, currentPath]);

  const handleSaveAs = async (event: FormEvent) => {
    event.preventDefault();
    const name = saveAsName.trim();
    if (!name || busy) return;
    const target = joinPath('/', name);
    setBusy(true);
    setError(null);
    try {
      await writeFile(target, content);
      setCurrentPath(target);
      setSavedContent(content);
      setSaveAsName('');
      setWindowTitle(win.id, baseName(target));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (currentPath) void save();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5">
        {currentPath ? (
          <>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || !isDirty}
              className="flex items-center gap-1.5 rounded-md bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200 transition-colors hover:bg-cyan-400/20 disabled:pointer-events-none disabled:opacity-40"
            >
              <SaveIcon className="h-3.5 w-3.5" />
              Save
            </button>
            <span className="truncate text-[11px] text-slate-500">{currentPath}</span>
          </>
        ) : (
          <form onSubmit={handleSaveAs} className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">File name:</span>
            <input
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder="untitled.txt"
              spellCheck={false}
              className="w-44 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-cyan-300/50"
            />
            <button
              type="submit"
              disabled={busy || !saveAsName.trim()}
              className="rounded-md bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200 transition-colors hover:bg-cyan-400/20 disabled:pointer-events-none disabled:opacity-40"
            >
              Save
            </button>
          </form>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-600">
          {isDirty && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-label="Unsaved changes" />
          )}
          Ctrl+S
        </span>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder="Start typing…"
        className="os-scroll min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
      />

      {error && (
        <p role="alert" className="border-t border-red-400/20 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
