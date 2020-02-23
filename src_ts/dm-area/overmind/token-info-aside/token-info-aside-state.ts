import { Derive } from "overmind";
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

export type LoadedActiveTokenState = Extract<
  ActiveTokenState,
  { mode: "loaded" }
>;

interface createLoadedActiveTokenStateInput {
  referenceId: string;
  id: string;
  [key: string]: any;
}

export const createLoadedActiveTokenState = ({
  referenceId,
  id
}: createLoadedActiveTokenStateInput): Extract<
  ActiveTokenState,
  { mode: "loaded" }
> => ({
  id,
  mode: "loaded",
  referenceId,
  reference: (state, root) => {
    return root.noteStore.notes[state.referenceId];
  }
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
