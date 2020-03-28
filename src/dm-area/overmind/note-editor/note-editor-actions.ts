import { AsyncAction, Action } from "overmind";

export const setActiveNoteId: AsyncAction<string> = async (
  { state },
  noteId
) => {
  if (state.noteEditor.activeNoteId === noteId) return;
  state.noteEditor.activeNoteId = noteId;
  state.noteEditor.isEditMode = false;

  localStorage.setItem(
    "settings.noteEditor.activeNoteId",
    JSON.stringify(noteId)
  );
};

export const setActiveModal: Action<string | null> = (
  { state },
  activeModal
) => {
  state.noteEditor.activeModal = activeModal;
};

export const loadNotes: AsyncAction = async ({ actions }) => {
  await actions.noteStore.loadAll();
};

export const updateActiveNoteTitle: AsyncAction<string> = async (
  { state, actions },
  title
) => {
  if (!state.noteEditor.activeNoteId) return;
  await actions.noteStore.updateNote({
    noteId: state.noteEditor.activeNoteId,
    title,
  });
};

export const updateActiveNoteContent: AsyncAction<string> = async (
  { state, actions },
  content
) => {
  if (!state.noteEditor.activeNoteId) return;
  await actions.noteStore.updateNote({
    noteId: state.noteEditor.activeNoteId,
    content,
  });
};

export const createNewNote: AsyncAction<{
  title?: string;
  content?: string;
}> = async ({ state, actions }, { title = "New note", content = "" }) => {
  const noteId = await actions.noteStore.createNote({ title, content });
  state.noteEditor.activeNoteId = noteId;
  state.noteEditor.isEditMode = true;
};

export const deleteActiveNote: AsyncAction = async ({ state, actions }) => {
  const { noteEditor } = state;

  if (!noteEditor.activeNoteId) return;

  await actions.noteStore.deleteNote(noteEditor.activeNoteId);
  noteEditor.activeNoteId = null;
};

export const toggleIsEditMode: Action = ({ state }) => {
  state.noteEditor.isEditMode = !state.noteEditor.isEditMode;
};
