import { AsyncAction, Action } from "overmind";
import {
  createLoadedActiveTokenState,
  ActiveTokenState,
  createNoSelectionTokenInfoAsideState,
  TokenInfoAsideStateType
} from "./token-info-aside-state";

export const setActiveToken: AsyncAction<{
  id: string;
  referenceId: string | null;
}> = async ({ state, actions }, activeToken) => {
  let activeTokenState;

  if (activeToken.referenceId === null) {
    state.tokenInfoAside.activeToken = activeTokenState = {
      id: activeToken.id,
      referenceId: activeToken.referenceId,
      mode: "notFound" as "notFound",
      reference: null
    };
    return;
  }
  state.tokenInfoAside.activeToken = activeTokenState = {
    id: activeToken.id,
    referenceId: activeToken.referenceId,
    mode: "loading" as "loading",
    reference: null
  };
  const reference = await actions.noteStore.loadById(activeToken.referenceId);
  if (reference === null) {
    state.tokenInfoAside.activeToken = activeTokenState = {
      id: activeToken.id,
      referenceId: activeToken.referenceId,
      mode: "notFound" as "notFound",
      reference: null
    };
  } else {
    (state.tokenInfoAside
      .activeToken as ActiveTokenState) = createLoadedActiveTokenState(
      activeTokenState
    );
  }
};

export const toggleActiveToken: AsyncAction<{
  id: string;
  reference: null | {
    id: string;
  };
}> = async ({ actions, state }, token) => {
  if (
    state.tokenInfoAside.activeToken &&
    state.tokenInfoAside.activeToken.id === token.id
  ) {
    ((state.tokenInfoAside as unknown) as TokenInfoAsideStateType) = createNoSelectionTokenInfoAsideState();
    return;
  }

  const internalToken = {
    id: token.id,
    referenceId: null as null | string
  };

  if (token.reference) {
    internalToken.referenceId = token.reference.id;
  }

  await actions.tokenInfoAside.setActiveToken(internalToken);
};

export const close: AsyncAction = async ({ state }) => {
  ((state.tokenInfoAside as unknown) as TokenInfoAsideStateType) = createNoSelectionTokenInfoAsideState();
};

export const setEditMode: Action<boolean> = ({ state }, isEditMode) => {
  state.tokenInfoAside.isEditMode = isEditMode;
};

export const updateActiveNoteTitle: Action<string> = (
  { state, actions },
  title
) => {
  if (
    !state.tokenInfoAside.activeToken ||
    state.tokenInfoAside.activeToken.mode !== "loaded"
  )
    return;

  actions.noteStore.updateNote({
    noteId: state.tokenInfoAside.activeToken.referenceId,
    title
  });
};

export const updateActiveNoteContent: Action<string> = (
  { state, actions },
  content
) => {
  if (
    !state.tokenInfoAside.activeToken ||
    state.tokenInfoAside.activeToken.mode !== "loaded"
  )
    return;

  actions.noteStore.updateNote({
    noteId: state.tokenInfoAside.activeToken.referenceId,
    content
  });
};
