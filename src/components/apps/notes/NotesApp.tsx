import { useEffect, useMemo, useRef } from 'react';
import { NotesIcon } from '../../icons/icons';
import { useNotesStore } from '../../../store/notesStore';
import { DeleteNoteButton, NoteList } from './NoteList';

export function NotesApp() {
  const notes = useNotesStore((s) => s.notes);
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const updateNoteContent = useNotesStore((s) => s.updateNoteContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );
  const selectedId = selectedNote?.id ?? null;

  useEffect(() => {
    if (selectedId !== null) textareaRef.current?.focus();
  }, [selectedId]);

  return (
    <div className="flex h-full">
      <NoteList />

      {selectedNote ? (
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
            <span className="truncate text-[11px] text-slate-500">
              Last edited{' '}
              {new Date(selectedNote.updatedAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <DeleteNoteButton noteId={selectedNote.id} />
          </div>
          <textarea
            ref={textareaRef}
            value={selectedNote.content}
            onChange={(e) => updateNoteContent(selectedNote.id, e.target.value)}
            placeholder="Start writing… the first line becomes the title."
            spellCheck={false}
            className="os-scroll min-h-0 flex-1 resize-none bg-transparent p-4 text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
          />
        </section>
      ) : (
        <section className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
            <NotesIcon className="h-6 w-6 text-slate-500" />
          </span>
          <p className="text-xs text-slate-400">
            {notes.length > 0 ? 'Select a note from the list.' : 'Create a note to get started.'}
          </p>
        </section>
      )}
    </div>
  );
}
