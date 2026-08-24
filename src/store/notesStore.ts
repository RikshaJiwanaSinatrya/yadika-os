import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { osStorage } from '../lib/osStorage';

export interface Note {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface NotesStore {
  notes: Note[];
  selectedNoteId: string | null;
  createNote: () => void;
  updateNoteContent: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;
}

/** The first line doubles as the note title. */
export function noteTitle(note: Note): string {
  const firstLine = note.content.split('\n', 1)[0]?.trim() ?? '';
  return firstLine || 'Untitled';
}

/** Everything after the title line, flattened for the list preview. */
export function noteSnippet(note: Note): string {
  const rest = note.content.split('\n').slice(1).join(' ').trim();
  return rest;
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set) => ({
      notes: [],
      selectedNoteId: null,

      createNote: () =>
        set((state) => {
          const now = Date.now();
          const note: Note = { id: crypto.randomUUID(), content: '', createdAt: now, updatedAt: now };
          return { notes: [note, ...state.notes], selectedNoteId: note.id };
        }),

      updateNoteContent: (id, content) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, content, updatedAt: Date.now() } : note,
          ),
        })),

      deleteNote: (id) =>
        set((state) => {
          const notes = state.notes.filter((note) => note.id !== id);
          const selectedNoteId =
            state.selectedNoteId === id
              ? (notes.sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null)
              : state.selectedNoteId;
          return { notes, selectedNoteId };
        }),

      selectNote: (id) => set({ selectedNoteId: id }),
    }),
    {
      name: 'yadika-os-notes',
      storage: createJSONStorage(() => osStorage),
      partialize: (state) => ({ notes: state.notes, selectedNoteId: state.selectedNoteId }),
    },
  ),
);
