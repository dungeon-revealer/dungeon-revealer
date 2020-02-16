const createState = () => ({
  activeNoteId: null,
  activeModal: null,
  filter: "",
  notes: (state, root) => {
    return Object.values(root.noteStore.notes).filter(
      note =>
        note.id === state.activeNoteId || note.title.includes(state.filter)
    );
  },
  activeNote: (state, root) => {
    if (!state.activeNoteId) return null;
    return root.noteStore.notes[state.activeNoteId] || null;
  }
});

export const state = createState();
