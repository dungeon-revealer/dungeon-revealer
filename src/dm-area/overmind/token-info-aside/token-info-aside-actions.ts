import { AsyncAction, Action, pipe, noop } from "overmind";
import * as util from "../util";
import { createNoSelectionTokenInfoAsideState } from "./token-info-aside-state";
import * as o from "./token-info-aside-operators";

type TSetActiveTokenInputType =
  | {
      mode: "noReference";
      id: string;
      referenceId: null;
    }
  | {
      mode: "hasReference";
      id: string;
      referenceId: string;
    };

export const setActiveToken: Action<TSetActiveTokenInputType> = pipe(
  o.matchReference<TSetActiveTokenInputType>({
    noReference: o.enterNotFoundState(),
    hasReference: pipe(
      o.enterLoadingState(),
      o.loadNoteById(),
      o.matchHasRemoteReference({
        notFound: o.enterNotFoundState(),
        found: o.enterLoadedState()
      })
    )
  })
);

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
    state.tokenInfoAside = util.castTreeNode(
      createNoSelectionTokenInfoAsideState()
    );
    return;
  }

  if (!token.reference) {
    return;
  }

  await actions.tokenInfoAside.setActiveToken(
    token.reference
      ? {
          mode: "hasReference",
          referenceId: token.reference.id,
          id: token.id
        }
      : {
          mode: "noReference",
          id: token.id,
          referenceId: null
        }
  );
};

export const close: AsyncAction = async ({ state }) => {
  state.tokenInfoAside = util.castTreeNode(
    createNoSelectionTokenInfoAsideState()
  );
};

export const setEditMode: Action<boolean> = ({ state }, isEditMode) => {
  state.tokenInfoAside.isEditMode = isEditMode;
};

export const updateActiveNoteTitle: Action<string> = pipe(
  o.selectActiveTokenTitleMode(),
  o.matchReference({
    noReference: noop(),
    hasReference: o.updateActiveTokenTitle()
  })
);

export const updateActiveNoteContent: Action<string> = pipe(
  o.selectActiveTokenContentMode(),
  o.matchReference({
    noReference: noop(),
    hasReference: o.updateActiveNoteContent()
  })
);
