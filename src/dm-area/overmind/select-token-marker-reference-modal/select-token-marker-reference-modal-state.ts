import { Derive } from "overmind";
import { NoteType, NoteRecord } from "../note-store/note-store-state";
import * as u from "../util";

export type ModalState =
  | {
      mode: "OVERVIEW";
    }
  | {
      mode: "ATTACH_EXISTING_NOTE";
    };

export type State =
  | {
      mode: "ACTIVE";
      tokenId: string;
      activeNoteId: string | null;
      activeNote: Derive<Extract<State, { mode: "ACTIVE" }>, NoteType | u.None>;
      notes: Derive<Extract<State, { mode: "ACTIVE" }>, NoteType[]>;
    }
  | {
      mode: "NONE";
    };

export type ActiveState = Extract<State, { mode: "ACTIVE" }>;
export type NoneState = Extract<State, { mode: "NONE" }>;

const isLoaded = <T extends u.Maybe<NoteRecord>>(
  r: T
): r is Extract<T, { mode: "LOADED" }> => u.isSome(r) && r.mode === "LOADED";

export const createNoneState = (): State => ({ mode: "NONE" });

export const createActiveState = ({ tokenId }: { tokenId: string }): State => ({
  mode: "ACTIVE",
  tokenId,
  activeNoteId: null,
  activeNote: (state, root) => {
    if (state.activeNoteId === null) {
      if (state.notes.length) {
        return state.notes[0];
      }
      return null;
    }
    const note = root.noteStore.notes[state.activeNoteId];
    if (u.isNone(note)) return null;
    return note.node;
  },
  notes: (state, root) => {
    return Object.values(root.noteStore.notes)
      .filter(isLoaded)
      .map((note) => note.node)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const state = createNoneState();
