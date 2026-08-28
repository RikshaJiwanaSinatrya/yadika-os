import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FormEvent,
  KeyboardEvent,
  ReactElement,
  ReactNode,
} from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  CutIcon,
  FileIcon,
  FilePlusIcon,
  FolderIcon,
  FolderPlusIcon,
  HardDriveIcon,
  PasteIcon,
  PencilIcon,
  RefreshIcon,
  SortIcon,
  TrashIcon,
} from '../../icons/icons';
import {
  type FsEntry,
  baseName,
  copyPath,
  joinPath,
  listDir,
  makeDir,
  movePath,
  parentPath,
  removePath,
  renamePath,
  writeFile,
} from '../../../lib/fsApi';
import { useWindowStore } from '../../../store/windowStore';

const ROOT = '/';
const DELETE_ARM_MS = 3000;

type SortKey = 'name' | 'size' | 'mtime';
type SortOrder = 'asc' | 'desc';

interface ClipboardState {
  kind: 'copy' | 'cut';
  paths: string[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(mtimeMs: number): string {
  return new Date(mtimeMs).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function breadcrumbSegments(dir: string): Array<{ name: string; path: string }> {
  const segments = [{ name: 'Home', path: ROOT }];
  let accumulated = '';
  for (const part of dir.split('/').filter(Boolean)) {
    accumulated = `${accumulated}/${part}`;
    segments.push({ name: part, path: accumulated });
  }
  return segments;
}

function compareEntries(a: FsEntry, b: FsEntry, key: SortKey, order: SortOrder): number {
  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
  let result: number;
  if (key === 'name') {
    result = a.name.localeCompare(b.name);
  } else if (key === 'size') {
    result = a.size - b.size;
  } else {
    result = a.mtimeMs - b.mtimeMs;
  }
  return order === 'asc' ? result : -result;
}

interface NameInputProps {
  initialValue: string;
  placeholder: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

function NameInput({ initialValue, placeholder, onCommit, onCancel }: NameInputProps) {
  const [value, setValue] = useState(initialValue);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onCommit(value);
    if (event.key === 'Escape') onCancel();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onCommit(value);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onCancel()}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full rounded-md border border-cyan-300/50 bg-white/10 px-2 py-0.5 text-xs text-slate-100 outline-none"
      />
    </form>
  );
}

export function ExplorerApp() {
  const openWindow = useWindowStore((s) => s.openWindow);

  const [tree, setTree] = useState<Record<string, FsEntry[]>>({});
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set([ROOT]));
  const [currentDir, setCurrentDir] = useState(ROOT);
  const [selected, setSelected] = useState<string | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [creatingKind, setCreatingKind] = useState<'file' | 'folder' | null>(null);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [error, setError] = useState<string | null>(null);
  const errorTimerRef = useRef<number | undefined>(undefined);

  const showError = useCallback((message: string) => {
    setError(message);
    window.clearTimeout(errorTimerRef.current);
    errorTimerRef.current = window.setTimeout(() => setError(null), 4000);
  }, []);

  useEffect(() => () => window.clearTimeout(errorTimerRef.current), []);

  const refreshDir = useCallback(
    async (dir: string) => {
      try {
        const entries = await listDir(dir);
        setTree((prev) => ({ ...prev, [dir]: entries }));
      } catch (reason) {
        showError(reason instanceof Error ? reason.message : String(reason));
      }
    },
    [showError],
  );

  useEffect(() => {
    let cancelled = false;
    listDir(ROOT)
      .then((entries) => {
        if (cancelled) return;
        setTree((prev) => ({ ...prev, [ROOT]: entries }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const purgeTreeBelow = (path: string) => {
    setTree((prev) => {
      const next: Record<string, FsEntry[]> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (key === path || key.startsWith(`${path}/`)) continue;
        next[key] = value;
      }
      return next;
    });
  };

  const openDirectory = useCallback(
    (dir: string) => {
      setCurrentDir(dir);
      setSelected(null);
      setRenamingPath(null);
      setCreatingKind(null);
      setExpanded((prev) => new Set(prev).add(dir));
      void refreshDir(dir);
    },
    [refreshDir],
  );

  const openFile = (entry: FsEntry) => {
    openWindow('editor', {
      title: entry.name,
      params: { path: joinPath(currentDir, entry.name) },
    });
  };

  const toggleExpand = (dir: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      return next;
    });
    void refreshDir(dir);
  };

  const startRename = (entry: FsEntry) => {
    const path = joinPath(currentDir, entry.name);
    setSelected(path);
    setRenamingPath(path);
  };

  const commitCreate = (name: string) => {
    const kind = creatingKind;
    setCreatingKind(null);
    const cleaned = name.trim();
    if (!kind || !cleaned) return;

    const target = joinPath(currentDir, cleaned);
    const action = kind === 'folder' ? makeDir(target) : writeFile(target, '');
    void action.then(
      () => void refreshDir(currentDir),
      (reason) => showError(reason instanceof Error ? reason.message : String(reason)),
    );
  };

  const commitRename = (oldPath: string, name: string) => {
    setRenamingPath(null);
    const cleaned = name.trim();
    if (!cleaned || cleaned === baseNameOf(oldPath)) return;

    const target = joinPath(parentPath(oldPath), cleaned);
    void renamePath(oldPath, target).then(
      () => {
        purgeTreeBelow(oldPath);
        setSelected((cur) => (cur === oldPath ? target : cur));
        void refreshDir(currentDir);
      },
      (reason) => showError(reason instanceof Error ? reason.message : String(reason)),
    );
  };

  const handleCopy = () => {
    if (!selected) return;
    setClipboard({ kind: 'copy', paths: [selected] });
  };

  const handleCut = () => {
    if (!selected) return;
    setClipboard({ kind: 'cut', paths: [selected] });
  };

  const handlePaste = () => {
    if (!clipboard || clipboard.paths.length === 0) return;
    const { kind, paths } = clipboard;
    const targetDir = currentDir;

    const operations = paths.map((source) => {
      const name = baseName(source);
      const destination = joinPath(targetDir, name);
      if (kind === 'copy') {
        return copyPath(source, destination).then(() => undefined);
      }
      // Cut is a move; the source folder itself is refreshed during cleanup.
      return movePath(source, destination);
    });

    Promise.all(operations).then(
      () => {
        if (kind === 'cut') {
          paths.forEach(purgeTreeBelow);
          setClipboard(null);
          setSelected(null);
        }
        void refreshDir(targetDir);
        if (kind === 'copy') {
          for (const source of paths) void refreshDir(parentPath(source));
        }
      },
      (reason) => showError(reason instanceof Error ? reason.message : String(reason)),
    );
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    if (armedDelete !== selected) {
      setArmedDelete(selected);
      window.setTimeout(
        () => setArmedDelete((cur) => (cur === selected ? null : cur)),
        DELETE_ARM_MS,
      );
      return;
    }
    setArmedDelete(null);
    const removed = selected;
    setSelected(null);
    purgeTreeBelow(removed);
    if (currentDir === removed || currentDir.startsWith(`${removed}/`)) {
      openDirectory(ROOT);
    } else {
      void refreshDir(currentDir);
      void refreshDir(parentPath(removed));
    }
    void removePath(removed).catch((reason) =>
      showError(reason instanceof Error ? reason.message : String(reason)),
    );
  };

  const currentEntries = [...(tree[currentDir] ?? [])].sort((a, b) =>
    compareEntries(a, b, sortKey, sortOrder),
  );
  const directoriesIn = (dir: string) =>
    (tree[dir] ?? []).filter((entry) => entry.type === 'directory');

  const renderTreeNode = (dir: string, depth: number): ReactElement => {
    const isOpen = expanded.has(dir);
    const isActive = currentDir === dir;
    return (
      <li key={dir}>
        <div
          className={`group flex items-center rounded-md pr-1 ${
            isActive ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
          style={{ paddingLeft: depth * 12 + 4 }}
        >
          <button
            type="button"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
            onClick={() => toggleExpand(dir)}
            className="grid h-5 w-5 shrink-0 place-items-center text-slate-500 hover:text-slate-200"
          >
            {isOpen ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={() => openDirectory(dir)}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
          >
            <FolderIcon className="h-3.5 w-3.5 shrink-0 text-cyan-300/70" />
            <span className={`truncate text-[11px] ${isActive ? 'text-white' : 'text-slate-300'}`}>
              {dir === ROOT ? 'Home' : baseNameOf(dir)}
            </span>
          </button>
        </div>
        {isOpen && directoriesIn(dir).length > 0 && (
          <ul>
            {directoriesIn(dir).map((child) => renderTreeNode(joinPath(dir, child.name), depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-full">
      <aside className="flex w-44 shrink-0 flex-col border-r border-white/10">
        <div className="flex items-center gap-1.5 px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          <HardDriveIcon className="h-3.5 w-3.5" />
          yadika-data
        </div>
        <ul className="os-scroll min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">{renderTreeNode(ROOT, 0)}</ul>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-0.5 overflow-hidden">
            {breadcrumbSegments(currentDir).map((segment, index, all) => (
              <span key={segment.path} className="flex min-w-0 items-center gap-0.5">
                {index > 0 && <ChevronRightIcon className="h-3 w-3 shrink-0 text-slate-600" />}
                <button
                  type="button"
                  onClick={() => openDirectory(segment.path)}
                  disabled={index === all.length - 1}
                  className={`truncate rounded px-1 text-[11px] transition-colors hover:bg-white/10 disabled:hover:bg-transparent ${
                    index === all.length - 1 ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {segment.name}
                </button>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ToolButton label="New file" onClick={() => setCreatingKind('file')} disabled={creatingKind !== null}>
              <FilePlusIcon className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label="New folder" onClick={() => setCreatingKind('folder')} disabled={creatingKind !== null}>
              <FolderPlusIcon className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label="Copy" onClick={handleCopy} disabled={!selected}>
              <CopyIcon className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label="Cut" onClick={handleCut} disabled={!selected}>
              <CutIcon className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              label={clipboard ? `Paste ${clipboard.kind === 'cut' ? '(move) ' : ''}(${clipboard.paths.length})` : 'Paste'}
              active={clipboard !== null}
              onClick={handlePaste}
              disabled={!clipboard}
            >
              <PasteIcon className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              label="Rename"
              onClick={() => {
                const entry = currentEntries.find((e) => joinPath(currentDir, e.name) === selected);
                if (entry) startRename(entry);
              }}
              disabled={!selected || parentPath(selected) !== currentDir}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              label={armedDelete === selected ? 'Confirm delete' : 'Delete'}
              danger={armedDelete === selected}
              onClick={handleDelete}
              disabled={!selected}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton label="Refresh" onClick={() => void refreshDir(currentDir)}>
              <RefreshIcon className="h-3.5 w-3.5" />
            </ToolButton>
            <SortButton sortKey={sortKey} sortOrder={sortOrder} onToggle={toggleSort} />
          </div>
        </div>

        <ul className="os-scroll min-h-0 flex-1 overflow-y-auto p-2">
          {creatingKind && (
            <li className="flex items-center gap-2 rounded-md px-2 py-1.5">
              {creatingKind === 'folder' ? (
                <FolderIcon className="h-4 w-4 shrink-0 text-cyan-300/70" />
              ) : (
                <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <NameInput
                initialValue=""
                placeholder={creatingKind === 'folder' ? 'folder name' : 'file.txt'}
                onCommit={(name) => commitCreate(name)}
                onCancel={() => setCreatingKind(null)}
              />
            </li>
          )}

          {(currentEntries ?? []).map((entry) => {
            const path = joinPath(currentDir, entry.name);
            const isSelected = selected === path;
            const isRenaming = renamingPath === path;
            return (
              <li key={entry.name}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(path)}
                  onDoubleClick={() => (entry.type === 'directory' ? openDirectory(path) : openFile(entry))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      if (entry.type === 'directory') {
                        openDirectory(path);
                      } else {
                        openFile(entry);
                      }
                    }
                  }}
                  className={`flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                    isSelected ? 'bg-cyan-400/15' : 'hover:bg-white/5'
                  }`}
                >
                  {entry.type === 'directory' ? (
                    <FolderIcon className="h-4 w-4 shrink-0 text-cyan-300/70" />
                  ) : (
                    <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  {isRenaming ? (
                    <NameInput
                      initialValue={entry.name}
                      placeholder="new name"
                      onCommit={(name) => commitRename(path, name)}
                      onCancel={() => setRenamingPath(null)}
                    />
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{entry.name}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-slate-600">
                        {entry.type === 'file' ? formatSize(entry.size) : '—'}
                      </span>
                      <span className="w-28 shrink-0 text-right text-[10px] tabular-nums text-slate-600">
                        {formatDate(entry.mtimeMs)}
                      </span>
                    </>
                  )}
                </div>
              </li>
            );
          })}

          {!creatingKind && currentEntries && currentEntries.length === 0 && (
            <li className="pt-10 text-center text-xs text-slate-500">This folder is empty.</li>
          )}
          {!currentEntries && !creatingKind && (
            <li className="pt-10 text-center text-xs text-slate-500">Loading…</li>
          )}
        </ul>

        {error && (
          <p role="alert" className="border-t border-red-400/20 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-300">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function baseNameOf(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function ToolButton({
  label,
  onClick,
  disabled = false,
  danger = false,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-6 w-6 place-items-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30 ${
        danger
          ? 'bg-red-500/20 text-red-200 hover:bg-red-500/40'
          : active
            ? 'bg-cyan-400/20 text-cyan-100 hover:bg-cyan-400/30'
            : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

const SORT_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size' },
  { key: 'mtime', label: 'Date modified' },
];

function SortButton({
  sortKey,
  sortOrder,
  onToggle,
}: {
  sortKey: SortKey;
  sortOrder: SortOrder;
  onToggle: (key: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeLabel = SORT_COLUMNS.find((col) => col.key === sortKey)?.label ?? 'Name';

  return (
    <div className="relative">
      <button
        type="button"
        title={`Sort by ${activeLabel} (${sortOrder === 'asc' ? 'ascending' : 'descending'})`}
        aria-label="Sort items"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${
          open ? 'bg-white/15 text-slate-100' : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
        }`}
      >
        <SortIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onPointerDown={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-7 z-20 w-36 rounded-lg border border-white/10 bg-slate-950/95 p-1 shadow-xl backdrop-blur-xl">
            {SORT_COLUMNS.map((col) => {
              const isActive = sortKey === col.key;
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => {
                    onToggle(col.key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] transition-colors ${
                    isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span>{col.label}</span>
                  {isActive && <span className="text-cyan-300/80">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
