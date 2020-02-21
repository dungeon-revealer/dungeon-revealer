import { Derive } from "overmind";
import { NoteType } from "../note-store/note-store-state";

export type ActiveTokenState = {
  id: string;
  referenceId: string | null;
  isLoading: Derive<ActiveTokenState, boolean>;
  reference: Derive<ActiveTokenState, NoteType | null>;
};

export type TokenInfoAsideStateType = {
  isVisible: Derive<TokenInfoAsideStateType, boolean>;
  isEditMode: boolean;
  activeToken: null | ActiveTokenState;
};

const createState = (): TokenInfoAsideStateType => ({
  isVisible(state) {
    return (
      state.activeToken !== null &&
      state.activeToken.isLoading === false &&
      state.activeToken.reference !== null
    );
  },
  isEditMode: false,
  activeToken: null
});

export const state = createState();

export const createTokenAsideActiveToken = ({
  tokenId,
  referenceId
}: {
  tokenId: string;
  referenceId: string | null;
}): ActiveTokenState => ({
  id: tokenId,
  referenceId,
  isLoading: (state, root) => {
    if (!state.referenceId) return false;
    return root.noteStore.loadingIds.includes(state.referenceId);
  },
  reference: (state, root) => {
    if (!state.referenceId) return null;
    return root.noteStore.notes[state.referenceId] || null;
  }
});
