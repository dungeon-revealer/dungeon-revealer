import { AsyncAction, Action, pipe, noop } from "overmind";
import * as util from "../util";
import { matchMode, matchSome } from "../operators";
import { createNoSelectionTokenInfoAsideState } from "./token-info-aside-state";
import * as o from "./token-info-aside-operators";

export const toggleActiveToken = o.whenIsCurrentToken({
  true: o.enterNoActiveTokenState(),
  false: matchSome((input) => input.reference, {
    none: noop(),
    some: pipe(o.loadReference(), o.enterActiveTokenWithReferenceState()),
  }),
});

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
  matchMode({
    noReference: noop(),
    hasReference: o.updateActiveTokenTitle(),
  })
);

export const updateActiveNoteContent: Action<string> = pipe(
  o.selectActiveTokenContentMode(),
  matchMode({
    noReference: noop(),
    hasReference: o.updateActiveNoteContent(),
  })
);
