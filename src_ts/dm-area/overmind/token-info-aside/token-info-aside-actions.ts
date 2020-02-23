import { AsyncAction, Action, ResolveState } from "overmind";
import {
  createLoadedActiveTokenState,
  createNoSelectionTokenInfoAsideState,
  createNotFoundActiveTokenState,
  createLoadingActiveTokenState
} from "./token-info-aside-state";

// fixes typings for assignment to the state tree.
// Only call this function on a node when assigning it to the state tree.
const castTreeNode = <TType extends any>(t: TType): ResolveState<TType> =>
  t as any;

export const setActiveToken: AsyncAction<{
  id: string;
  referenceId: string | null;
}> = async ({ state, actions }, { id, referenceId }) => {
  if (referenceId === null) {
    state.tokenInfoAside.activeToken = castTreeNode(
      createNotFoundActiveTokenState({ id, referenceId })
    );
    return;
  }

  state.tokenInfoAside.activeToken = castTreeNode(
    createLoadingActiveTokenState({ id, referenceId })
  );

  // @TODO: race condition handling
  const reference = await actions.noteStore.loadById(referenceId);

  if (reference === null) {
    state.tokenInfoAside.activeToken = castTreeNode(
      createNotFoundActiveTokenState(state.tokenInfoAside.activeToken)
    );
  } else {
    state.tokenInfoAside.activeToken = castTreeNode(
      createLoadedActiveTokenState(state.tokenInfoAside.activeToken)
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
    state.tokenInfoAside = castTreeNode(createNoSelectionTokenInfoAsideState());
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
  state.tokenInfoAside = castTreeNode(createNoSelectionTokenInfoAsideState());
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
