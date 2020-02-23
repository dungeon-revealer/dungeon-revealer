import { Derive, ResolveState } from "overmind";
import { NoteType } from "../note-store/note-store-state";

export type ActiveTokenState = {
  id: string;
} & (
  | {
      mode: "loading";
      referenceId: string;
      reference: null;
    }
  | {
      mode: "loaded";
      referenceId: string;
      reference: Derive<
        Extract<ActiveTokenState, { mode: "loaded" }>,
        NoteType
      >;
    }
  | {
      mode: "notFound";
      referenceId: string | null;
      reference: null;
    });

export type LoadingActiveTokenState = Extract<
  ActiveTokenState,
  { mode: "loading" }
>;

export type NotFoundActiveTokenState = Extract<
  ActiveTokenState,
  { mode: "notFound" }
>;

export type LoadedActiveTokenState = Extract<
  ActiveTokenState,
  { mode: "loaded" }
>;

export const createLoadingActiveTokenState = ({
  referenceId,
  id
}: {
  referenceId: string;
  id: string;
}): LoadingActiveTokenState => ({
  mode: "loading",
  id,
  reference: null,
  referenceId
});

export const createLoadedActiveTokenState = ({
  referenceId,
  id
}: LoadingActiveTokenState): LoadedActiveTokenState => ({
  id,
  mode: "loaded",
  referenceId,
  reference: (state, root) => {
    return root.noteStore.notes[state.referenceId] || null;
  }
});

export const createNotFoundActiveTokenState = ({
  referenceId,
  id
}:
  | LoadingActiveTokenState
  | { referenceId: null; id: string }): NotFoundActiveTokenState => ({
  id,
  mode: "notFound",
  referenceId,
  reference: null
});

export type TokenInfoAsideStateType = {
  isEditMode: boolean;
} & (
  | {
      isVisible: Derive<TokenInfoAsideStateType, true>;
      activeToken: ActiveTokenState;
    }
  | {
      isVisible: Derive<TokenInfoAsideStateType, false>;
      activeToken: null;
    });

const createState = (): TokenInfoAsideStateType => ({
  activeToken: null,
  isEditMode: false,
  isVisible(state) {
    return (state.activeToken !== null) as any;
  }
});

export const createNoSelectionTokenInfoAsideState = createState;

export const state = createState();
