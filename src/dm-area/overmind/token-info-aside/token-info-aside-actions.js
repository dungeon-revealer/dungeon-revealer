import { createTokenAsideActiveToken } from "./token-info-aside-state";

export const toggleActiveToken = async ({ actions, state }, token) => {
  if (
    state.tokenInfoAside.activeToken &&
    state.tokenInfoAside.activeToken.id === token.id
  ) {
    state.tokenInfoAside.activeToken = null;
    return;
  }
  let referenceId = null;
  if (token.reference) {
    referenceId = token.reference.id;
  }

  state.tokenInfoAside.activeToken = createTokenAsideActiveToken({
    tokenId: token.id,
    referenceId
  });

  await actions.noteStore.loadById(referenceId);
};

export const setEditMode = ({ state }, isEditMode) => {
  state.tokenInfoAside.isEditMode = isEditMode;
};

export const updateActiveNoteTitle = ({ state, actions }, title) => {
  actions.noteStore.updateNote({
    noteId: state.tokenInfoAside.activeToken.referenceId,
    title
  });
};

export const updateActiveNoteContent = ({ state, actions }, content) => {
  actions.noteStore.updateNote({
    noteId: state.tokenInfoAside.activeToken.referenceId,
    content
  });
};
