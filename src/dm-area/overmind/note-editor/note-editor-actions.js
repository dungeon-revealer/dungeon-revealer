export const setActiveNoteId = async ({ state }, noteId) => {
  state.noteEditor.activeNoteId = noteId;
};

export const setActiveModal = async ({ state }, activeModal) => {
  state.noteEditor.activeModal = activeModal;
};

export const loadNotes = async ({ actions }) => {
  await actions.noteStore.loadAll();
};

export const updateActiveNoteTitle = async ({ state, actions }, title) => {
  await actions.noteStore.updateNote({
    noteId: state.noteEditor.activeNoteId,
    title
  });
};

export const updateActiveNoteContent = async ({ state, actions }, content) => {
  await actions.noteStore.updateNote({
    noteId: state.noteEditor.activeNoteId,
    content
  });
};

export const createNewNote = async (
  { state, actions },
  { title = "New note", content = "" }
) => {
  const note = await actions.noteStore.createNote({ title, content });
  state.noteEditor.activeNoteId = note.id;
};

export const deleteActiveNote = async ({ state, actions }) => {
  const { noteEditor } = state;

  if (!noteEditor.activeNoteId) {
    return;
  }

  await actions.noteStore.deleteNote(noteEditor.activeNoteId);
  noteEditor.activeNoteId = null;
};
