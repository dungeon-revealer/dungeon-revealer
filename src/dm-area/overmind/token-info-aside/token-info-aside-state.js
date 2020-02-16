const createState = () => ({
  isVisible(state) {
    return (
      state.activeToken !== null &&
      state.activeToken.isLoading === false &&
      state.activeToken.reference !== null
    );
  },
  isEditMode: false,
  activeToken: null
});

export const state = createState();

export const createTokenAsideActiveToken = ({ tokenId, referenceId }) => ({
  id: tokenId,
  referenceId,
  isLoading: (state, root) => {
    if (!state.referenceId) return false;
    return root.noteStore.loadingIds.includes(state.referenceId);
  },
  reference: (state, root) => {
    return root.noteStore.notes[state.referenceId] || null;
  }
});
