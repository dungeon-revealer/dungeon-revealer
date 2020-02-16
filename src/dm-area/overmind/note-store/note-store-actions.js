import debounce from "lodash/debounce";

const createNoteTreeNode = note => ({
  ...note,
  isDirty: false
});

export const loadAll = async ({ state, effects }) => {
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

export const loadById = async ({ state, effects }, noteId) => {
  const { noteStore, sessionStore } = state;
  if (noteStore.loadingIds.includes(noteId)) return;
  noteStore.loadingIds.push(noteId);
  const note = await effects.noteStore.loadById(noteId, {
    accessToken: sessionStore.accessToken
  });
  noteStore.notes[note.id] = note;
  const index = noteStore.loadingIds.findIndex(id => id === noteId);
  if (index < 0) return;
  noteStore.loadingIds.splice(index, 1);
};

export const createNote = async ({ state, effects }, { title, content }) => {
  const { noteStore, sessionStore } = state;
  const note = await effects.noteStore.create(
    { title, content },
    {
      accessToken: sessionStore.accessToken
    }
  );
  noteStore.notes[note.id] = createNoteTreeNode(note);
  return note;
};

export const updateNote = async (
  { state, actions },
  { noteId, title, content }
) => {
  const note = state.noteStore.notes[noteId];
  if (title) {
    note.title = title;
  }
  if (content) {
    note.content = content;
  }

  note.isDirty = true;
  actions.noteStore.saveNote(noteId);
};

export const deleteNote = async ({ state, effects }, noteId) => {
  delete state.noteStore.notes[noteId];
  await effects.noteStore.deleteById(noteId, {
    accessToken: state.sessionStore.accessToken
  });
};

export const saveNote = debounce(async ({ state, effects }, noteId) => {
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
