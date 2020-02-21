import { Derive } from "overmind";
import { NoteType } from "../note-store/note-store-state";

const tryParseJson = input => {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
};
const getInitialActiveNoteId = () => {
  const maybeId = tryParseJson(
    localStorage.getItem("settings.noteEditor.activeNoteId")
  );
  if (typeof maybeId === "string") return maybeId;
  return null;
};

export type NoteEditorStateType = {
  activeNoteId: string | null;
  activeModal: null | string;
  filter: string;
  notes: Derive<NoteEditorStateType, NoteType[]>;
  activeNote: Derive<NoteEditorStateType, NoteType | null>;
  isEditMode: boolean;
};

const createState = (): NoteEditorStateType => ({
  activeNoteId: getInitialActiveNoteId(),
  activeModal: null,
  filter: "",
  notes: (state, root) => {
    return Object.values(root.noteStore.notes)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter(
        note =>
          note.id === state.activeNoteId || note.title.includes(state.filter)
      );
  },
  activeNote: (state, root) => {
    if (!state.activeNoteId) return null;
    return root.noteStore.notes[state.activeNoteId] || null;
  },
  isEditMode: false
});

export const state = createState();
