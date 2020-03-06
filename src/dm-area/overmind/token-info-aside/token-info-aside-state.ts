import { Derive, ResolveState } from "overmind";
import { NoteRecord } from "../note-store/note-store-state";

export type ActiveTokenState =
  | {
      mode: "noReference";
      id: string;
      referenceId: null;
    }
  | {
      mode: "hasReference";
      id: string;
      referenceId: string;
      reference: Derive<
        Extract<ActiveTokenState, { mode: "hasReference" }>,
        NoteRecord
      >;
    };

export type ActiveTokenHasReferenceState = Extract<
  ActiveTokenState,
  { mode: "hasReference" }
>;

export type ActiveTokenNoReferenceState = Extract<
  ActiveTokenState,
  { mode: "noReference" }
>;

export const createLoadingActiveTokenState = ({
  referenceId,
  id
}: {
  referenceId: string;
  id: string;
}): ActiveTokenHasReferenceState => ({
  mode: "hasReference",
  id,
  referenceId,
  reference: (state, root) => {
    const note = root.noteStore.notes[state.referenceId];
    if (!note) {
      throw new Error("Invalid state. This should be handled different.");
    }
    return note;
  }
});

export const createLoadedActiveTokenState = ({
  id
}: {
  id: string;
}): ActiveTokenNoReferenceState => ({
  id,
  mode: "noReference",
  referenceId: null
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
    }
);

const createState = (): TokenInfoAsideStateType => ({
  activeToken: null,
  isEditMode: false,
  isVisible(state) {
    return (state.activeToken !== null) as any;
  }
});

export const createNoSelectionTokenInfoAsideState = createState;

export const state = createState();
