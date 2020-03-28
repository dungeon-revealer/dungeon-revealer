import { Derive } from "overmind";
import { Maybe } from "../util";

export type NoteRecord = {
  id: string;
} & (
  | {
      mode: "NOT_FOUND";
      node: null;
    }
  | {
      mode: "LOADING";
      node: null;
    }
  | {
      mode: "LOADED";
      node: NoteType;
    }
  | {
      mode: "CACHE_AND_LOADING";
      node: NoteType;
    }
);

export type NoteStoreStateType = {
  loadingIds: NoteRecord["id"][];
  isLoading: Derive<NoteStoreStateType, boolean>;
  isLoadingAll: boolean;
  notes: {
    [id: string]: Maybe<NoteRecord>;
  };
};

export type RawNoteType = {
  id: NoteRecord["id"];
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export type NoteType = {
  id: NoteRecord["id"];
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isDirty: boolean;
};

const createState = (): NoteStoreStateType => ({
  loadingIds: [],
  isLoading: (state) => {
    return Boolean(state.loadingIds.length) || state.isLoadingAll;
  },
  isLoadingAll: false,
  notes: {},
});

export const createNoteTreeNode = (note: RawNoteType): NoteType => ({
  ...note,
  isDirty: false,
});

export const state = createState();
