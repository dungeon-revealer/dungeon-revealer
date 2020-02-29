import { AsyncAction } from "overmind";
import { createNoteTreeNode, NoteType } from "./note-store-state";
import debounce from "lodash/debounce";

export const loadAll: AsyncAction = async ({ state, effects }) => {
  const { noteStore } = state;
  noteStore.isLoadingAll = true;
  const notes = await effects.noteStore.loadAll({
    accessToken: state.sessionStore.accessToken
  });
  for (const note of notes.map(createNoteTreeNode)) {
    noteStore.notes[note.id] = note;
  }
  noteStore.isLoadingAll = false;
};

export const loadById: AsyncAction<string, string | null> = async (
  { state, effects },
  noteId
) => {
  const { noteStore, sessionStore } = state;
  if (!noteStore.loadingIds.includes(noteId)) {
    noteStore.loadingIds.push(noteId);
  }
  const note = await effects.noteStore.loadById(noteId, {
    accessToken: sessionStore.accessToken
  });

  if (note === null) return null;
  noteStore.notes[note.id] = createNoteTreeNode(note);
  const index = noteStore.loadingIds.findIndex(id => id === noteId);
  if (index < 0) return note.id;
  noteStore.loadingIds.splice(index, 1);
  return note.id;
};

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
      accessToken: sessionStore.accessToken
    }
  );
  noteStore.notes[note.id] = createNoteTreeNode(note);
  return note.id;
};

export const updateNote: AsyncAction<{
  noteId: string;
  title?: string;
  content?: string;
}> = async ({ state, actions }, { noteId, title, content }) => {
  const note = state.noteStore.notes[noteId];
  if (!note) return;
  if (typeof title === "string") {
    note.title = title;
  }
  if (typeof content === "string") {
    note.content = content;
  }

  note.isDirty = true;
  actions.noteStore.saveNote(noteId);
};

export const deleteNote: AsyncAction<string> = async (
  { state, effects },
  noteId
) => {
  state.noteStore.notes[noteId] = null;
  await effects.noteStore.deleteById(noteId, {
    accessToken: state.sessionStore.accessToken
  });
};

export const saveNote = debounce(async ({ state, effects }, noteId: string) => {
  let note = state.noteStore.notes[noteId];
  note.isDirty = false;
  const updatedNote = await effects.noteStore.update(
    noteId,
    state.noteStore.notes[noteId],
    {
      accessToken: state.sessionStore.accessToken
    }
  );

  note = state.noteStore.notes[noteId];
  // apply changes if it did not change in the meantime
  if (note.isDirty === false) {
    note.title = updatedNote.title;
    note.content = updatedNote.content;
    note.updatedAt = updatedNote.updatedAt;
  }
}, 500);
