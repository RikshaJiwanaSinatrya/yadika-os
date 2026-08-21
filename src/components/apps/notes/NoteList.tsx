import { NotesIcon, PlusIcon, TrashIcon } from '../../icons/icons';
import { noteSnippet, noteTitle, useNotesStore } from '../../../store/notesStore';
import type { Note } from '../../../store/notesStore';

function formatNoteTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString([], options);
}

function NoteListItem({
  note,
  isSelected,
  onSelect,
}: {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
        isSelected ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span
          className={`truncate text-xs font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}
        >
          {noteTitle(note)}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
          {formatNoteTime(note.updatedAt)}
        </span>
      </span>
      <span className="mt-0.5 block truncate text-[11px] text-slate-500">
        {noteSnippet(note) || 'No additional text'}
      </span>
    </button>
  );
}

export function NoteList() {
  const notes = useNotesStore((s) => s.notes);
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const createNote = useNotesStore((s) => s.createNote);
  const selectNote = useNotesStore((s) => s.selectNote);

  const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className="flex w-44 shrink-0 flex-col border-r border-white/10">
      <div className="p-2">
        <button
          type="button"
          onClick={() => createNote()}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-400/20 focus-visible:outline-2 focus-visible:outline-cyan-300/70"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          New note
        </button>
      </div>

      {sortedNotes.length > 0 ? (
        <ul className="os-scroll flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {sortedNotes.map((note) => (
            <li key={note.id}>
              <NoteListItem
                note={note}
                isSelected={note.id === selectedNoteId}
                onSelect={() => selectNote(note.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
          <NotesIcon className="h-6 w-6 text-slate-600" />
          <p className="text-[11px] leading-relaxed text-slate-500">
            No notes yet.
            <br />
            Create your first one.
          </p>
        </div>
      )}
    </aside>
  );
}

export function DeleteNoteButton({ noteId }: { noteId: string }) {
  const deleteNote = useNotesStore((s) => s.deleteNote);
  return (
    <button
      type="button"
      aria-label="Delete note"
      title="Delete note"
      onClick={() => deleteNote(noteId)}
      className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition-colors hover:bg-red-500/20 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-cyan-300/70"
    >
      <TrashIcon className="h-3.5 w-3.5" />
    </button>
  );
}
