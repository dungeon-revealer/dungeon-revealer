import { Operator, mutate, map, action } from "overmind";
import { switchMap, match } from "../operators";
import * as util from "../util";

import {
  createLoadedActiveTokenState,
  createNoSelectionTokenInfoAsideState,
  createNotFoundActiveTokenState,
  createLoadingActiveTokenState
} from "./token-info-aside-state";

import { OperatorMatcher } from "../dynamic-match";

type BaseModeType = { mode: "noReference" } | { mode: "hasReference" };

export const matchReference = <TType extends BaseModeType = BaseModeType>(
  matcher: OperatorMatcher<"mode", TType["mode"], TType>
): Operator<TType> => match("mode", matcher);

export const enterNotFoundState: () => Operator<
  | {
      id: string;
      referenceId: null;
    }
  | {
      id: string;
      referenceId: string;
    },
  void
> = () =>
  mutate(({ state }, { id, referenceId }) => {
    state.tokenInfoAside.activeToken = util.castTreeNode(
      createNotFoundActiveTokenState({ id, referenceId })
    );
  });

export const enterLoadingState: () => Operator<{
  id: string;
  referenceId: string;
}> = () =>
  mutate(({ state }, { id, referenceId }) => {
    state.tokenInfoAside.activeToken = util.castTreeNode(
      createLoadingActiveTokenState({ id, referenceId })
    );
  });

export const enterLoadedState: () => Operator<{
  id: string;
  referenceId: string;
}> = () =>
  mutate(({ state }, { id, referenceId }) => {
    state.tokenInfoAside.activeToken = util.castTreeNode(
      createLoadedActiveTokenState({ id, referenceId })
    );
  });

type HasRemoteReferenceType =
  | {
      mode: "found";
      id: string;
      referenceId: string;
    }
  | {
      mode: "notFound";
      id: string;
      referenceId: string;
    };

export const loadNoteById: () => Operator<
  {
    id: string;
    referenceId: string;
  },
  HasRemoteReferenceType
> = () =>
  switchMap(({ actions }, { id, referenceId }) =>
    actions.noteStore.loadById(referenceId).then(reference => ({
      id,
      referenceId,
      mode: reference ? "found" : "notFound"
    }))
  );

export const matchHasRemoteReference = (
  matcher: OperatorMatcher<
    "mode",
    HasRemoteReferenceType["mode"],
    HasRemoteReferenceType
  >
) => match("mode", matcher);

export const selectActiveTokenContentMode = () =>
  map(({ state }, newContent: string) => {
    if (
      !state.tokenInfoAside.activeToken ||
      !state.tokenInfoAside.activeToken.reference
    )
      return { mode: "noReference" as "noReference", newContent };
    return {
      mode: "hasReference" as "hasReference",
      newContent,
      referenceId: state.tokenInfoAside.activeToken.reference.id
    };
  });

export const updateActiveNoteContent = () =>
  action(
    (
      { actions },
      { newContent, referenceId }: { newContent: string; referenceId: string }
    ) => {
      actions.noteStore.updateNote({
        noteId: referenceId,
        content: newContent
      });
    }
  );

export const selectActiveTokenTitleMode = () =>
  map(({ state }, newTitle: string) => {
    if (
      !state.tokenInfoAside.activeToken ||
      !state.tokenInfoAside.activeToken.reference
    )
      return { mode: "noReference" as "noReference", newTitle };
    return {
      mode: "hasReference" as "hasReference",
      newTitle,
      referenceId: state.tokenInfoAside.activeToken.reference.id
    };
  });

export const updateActiveTokenTitle = () =>
  action(
    (
      { actions },
      { newTitle, referenceId }: { newTitle: string; referenceId: string }
    ) => {
      actions.noteStore.updateNote({
        noteId: referenceId,
        title: newTitle
      });
    }
  );
