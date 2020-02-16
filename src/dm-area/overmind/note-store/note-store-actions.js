import debounce from "lodash/debounce";

export const loadAll = async ({ state, effects }) => {
  const { noteStore } = state;
  noteStore.isLoadingAll = true;
  const notes = await effects.noteStore.loadAll({
    accessToken: state.sessionStore.accessToken
  });
  for (const note of notes) {
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
  noteStore.notes[note.id] = note;
  return note;
};

export const updateNote = async (
  { state, actions },
  { noteId, title, content }
) => {
  if (title) {
    state.noteStore.notes[noteId].title = title;
  }
  if (content) {
    state.noteStore.notes[noteId].content = content;
  }
  actions.noteStore.saveNote(noteId);
};

export const deleteNote = async ({ state, effects }, noteId) => {
  delete state.noteStore.notes[noteId];
  await effects.noteStore.deleteById(noteId, {
    accessToken: state.sessionStore.accessToken
  });
};

export const saveNote = debounce(async ({ state, effects }, noteId) => {
  effects.noteStore.update(noteId, state.noteStore.notes[noteId], {
    accessToken: state.sessionStore.accessToken
  });
}, 500);
