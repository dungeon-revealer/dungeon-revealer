import { AsyncAction, pipe, map, noop } from "overmind";
import { createNoteTreeNode, NoteType } from "./note-store-state";
import debounce from "lodash/debounce";
import * as o from "./note-store-operators";
import { matchMode } from "../operators";
import { isSome } from "../util";

export const loadAll: AsyncAction = pipe(
  o.enterLoadingAllState(),
  o.loadAllNotes(),
  o.leaveLoadingAllState()
);

const _loadById = pipe(
  o.loadNoteById(),
  matchMode({
    NOT_FOUND: o.enterNoteNotFoundState(),
    FOUND: o.enterNoteLoadedState(),
  })
);

export const loadById = pipe(
  o.selectCacheRecord(),
  matchMode({
    NOT_FOUND: pipe(o.enterNoteLoadingState(), _loadById),
    LOADED: pipe(o.enterNoteCacheAndLoadingState(), _loadById),
    CACHE_AND_LOADING: _loadById,
    LOADING: _loadById,
  })
);

export const createNote: AsyncAction<
  {
    title: string;
    content: string;
  },
  string
> = async ({ state, effects }, { title, content }) => {
  const { noteStore, sessionStore } = state;
  const note = await effects.noteStore.create(
    { title, content },
    {
      accessToken: sessionStore.accessToken,
    }
  );
  noteStore.notes[note.id] = {
    mode: "LOADED",
    id: note.id,
    node: createNoteTreeNode(note),
  };
  return note.id;
};

export const updateNote: AsyncAction<{
  noteId: string;
  title?: string;
  content?: string;
}> = async ({ state, actions }, { noteId, title, content }) => {
  const note = state.noteStore.notes[noteId];
  if (!isSome(note) || note.mode !== "LOADED") return;
  if (typeof title === "string") {
    note.node.title = title;
  }
  if (typeof content === "string") {
    note.node.content = content;
  }

  note.node.isDirty = true;
  actions.noteStore.saveNote(noteId);
};

export const deleteNote: AsyncAction<string> = async (
  { state, effects },
  noteId
) => {
  state.noteStore.notes[noteId] = null;
  await effects.noteStore.deleteById(noteId, {
    accessToken: state.sessionStore.accessToken,
  });
};

export const saveNote: AsyncAction<string> = debounce(
  async ({ state, effects }, noteId) => {
    let note = state.noteStore.notes[noteId];
    if (!isSome(note) || note.mode !== "LOADED") return;
    note.node.isDirty = false;
    const updatedNote = await effects.noteStore.update(noteId, note.node, {
      accessToken: state.sessionStore.accessToken,
    });

    note = state.noteStore.notes[noteId];
    if (!isSome(note) || note.mode !== "LOADED") return;
    // apply changes if it did not change in the meantime
    if (note.node.isDirty === false) {
      note.node.title = updatedNote.title;
      note.node.content = updatedNote.content;
      note.node.updatedAt = updatedNote.updatedAt;
    }
  },
  500
);
