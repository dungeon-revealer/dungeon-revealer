import { Derive } from "overmind";
import { NoteType, NoteRecord } from "../note-store/note-store-state";
import { isSome, Maybe } from "../util";

const tryParseJson = (input: any) => {
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
  isLoading: Derive<NoteEditorStateType, boolean>;
};

const isLoaded = <T extends Maybe<NoteRecord>>(
  r: T
): r is Extract<T, { mode: "LOADED" }> => isSome(r) && r.mode === "LOADED";

const createState = (): NoteEditorStateType => ({
  activeNoteId: getInitialActiveNoteId(),
  activeModal: null,
  filter: "",
  notes: (state, root) => {
    return Object.values(root.noteStore.notes)
      .filter(isLoaded)
      .map(note => note.node)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter(
        note =>
          note.id === state.activeNoteId || note.title.includes(state.filter)
      );
  },
  activeNote: (state, root) => {
    if (!state.activeNoteId) return state.notes[0] ? state.notes[0] : null;
    const note = root.noteStore.notes[state.activeNoteId];
    if (!note) return state.notes[0] ? state.notes[0] : null;
    return note.node;
  },
  isEditMode: false,
  isLoading: (state, root) => {
    return root.noteStore.isLoadingAll;
  }
});

export const state = createState();
