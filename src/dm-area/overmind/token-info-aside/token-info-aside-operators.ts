import { Operator, map, action, mutate, when } from "overmind";
import { switchMap } from "../operators";
import * as util from "../util";
import { ActiveTokenHasReferenceState } from "./token-info-aside-state";

export const loadReference: () => Operator<{
  value: { id: string };
  selection: { id: string };
}> = () =>
  switchMap(async ({ actions }, input) =>
    actions.noteStore.loadById(input.selection.id).then(() => input)
  );

type Token = { id: string; reference: util.Maybe<{ id: string }> };

export const whenIsCurrentToken = <
  TInputToken extends Token,
  TTrueOperatorOutput,
  TFalseOperatorOutput
>(paths: {
  true: Operator<TInputToken, TTrueOperatorOutput>;
  false: Operator<TInputToken, TFalseOperatorOutput>;
}): Operator<TInputToken, TTrueOperatorOutput | TFalseOperatorOutput> =>
  when(
    (context, input: TInputToken) =>
      !!context.state.tokenInfoAside.activeToken &&
      input.id === context.state.tokenInfoAside.activeToken.id,
    paths
  );

export const enterNoActiveTokenState = () =>
  mutate(({ state }) => {
    state.tokenInfoAside.activeToken = null;
  });

export const enterActiveTokenWithReferenceState: () => Operator<{
  value: { id: string };
  selection: { id: string };
}> = () =>
  mutate(({ state }, { value: { id }, selection: { id: referenceId } }) => {
    state.tokenInfoAside.activeToken = util.castTreeNode({
      mode: "hasReference",
      id,
      referenceId,
      reference: (state, root) => {
        return root.noteStore.notes[state.referenceId];
      },
    } as ActiveTokenHasReferenceState);
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
  switchMap(async ({ actions, state }, { id, referenceId }) => {
    await actions.noteStore.loadById(referenceId);

    return {
      id,
      referenceId,
      mode: state.noteStore.notes[referenceId] ? "found" : "notFound",
    };
  });

export const selectActiveTokenContentMode = () =>
  map(({ state }, newContent: string) => {
    if (
      !state.tokenInfoAside.activeToken ||
      !state.tokenInfoAside.activeToken.referenceId
    )
      return { mode: "noReference" as "noReference", newContent };
    return {
      mode: "hasReference" as "hasReference",
      newContent,
      referenceId: state.tokenInfoAside.activeToken.reference.id,
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
        content: newContent,
      });
    }
  );

export const selectActiveTokenTitleMode = () =>
  map(({ state }, newTitle: string) => {
    if (
      !state.tokenInfoAside.activeToken ||
      !state.tokenInfoAside.activeToken.referenceId
    )
      return { mode: "noReference" as "noReference", newTitle };
    return {
      mode: "hasReference" as "hasReference",
      newTitle,
      referenceId: state.tokenInfoAside.activeToken.reference.id,
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
        title: newTitle,
      });
    }
  );
