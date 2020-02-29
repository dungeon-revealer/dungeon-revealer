import { Derive } from "overmind";

type Maybe<T = unknown> = T | null | undefined;

export type NoteStoreStateType = {
  loadingIds: string[];
  isLoading: Derive<NoteStoreStateType, boolean>;
  isLoadingAll: boolean;
  notes: {
    [id: string]: Maybe<NoteType>;
  };
};

export type RawNoteType = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export type NoteType = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isDirty: boolean;
};

const createState = (): NoteStoreStateType => ({
  loadingIds: [],
  isLoading: state => {
    return Boolean(state.loadingIds.length) || state.isLoadingAll;
  },
  isLoadingAll: false,
  notes: {}
});

export const createNoteTreeNode = (note: RawNoteType): NoteType => ({
  ...note,
  isDirty: false
});

export const state = createState();
