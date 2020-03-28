import { switchMap } from "../operators";
import { mutate, map, Operator, fork } from "overmind";
import {
  createNoteTreeNode,
  RawNoteType,
  NoteRecord,
} from "./note-store-state";
import { isSome } from "../util";

export const enterLoadingAllState = () =>
  mutate(({ state }) => {
    state.noteStore.isLoadingAll = true;
  });

export const selectCacheRecord = () =>
  map(
    ({ state }, noteId: string): NoteRecord => {
      const record = state.noteStore.notes[noteId];
      if (isSome(record)) {
        return record;
      }
      // default to NOT_FOUND record
      return {
        mode: "NOT_FOUND" as "NOT_FOUND",
        id: noteId,
        node: null,
      };
    }
  );

export const leaveLoadingAllState = () =>
  mutate(({ state }, notes: RawNoteType[]) => {
    for (const note of notes.map(createNoteTreeNode)) {
      state.noteStore.notes[note.id] = {
        mode: "LOADED",
        id: note.id,
        node: note,
      };
    }
    state.noteStore.isLoadingAll = false;
  });

export const loadAllNotes = () =>
  switchMap(({ effects, state: { sessionStore: { accessToken } } }) =>
    effects.noteStore.loadAll({ accessToken })
  );

export const loadNoteById = () =>
  switchMap(
    (
      {
        effects,
        state: {
          sessionStore: { accessToken },
        },
      },
      record: NoteRecord
    ) => effects.noteStore.loadById(record.id, { accessToken })
  );

export const enterNoteLoadingState = () =>
  mutate(({ state }, record: NoteRecord) => {
    state.noteStore.notes[record.id] = {
      mode: "LOADING",
      id: record.id,
      node: null,
    };
  });

export const enterNoteCacheAndLoadingState = () =>
  mutate(
    (
      { state },
      record: Extract<NoteRecord, { mode: "CACHE_AND_LOADING" | "LOADED" }>
    ) => {
      state.noteStore.notes[record.id] = {
        mode: "CACHE_AND_LOADING",
        id: record.id,
        node: record.node,
      };
    }
  );

export const enterNoteLoadedState = () =>
  mutate(({ state }, { note }: { mode: "FOUND"; note: RawNoteType }) => {
    state.noteStore.notes[note.id] = {
      mode: "LOADED",
      id: note.id,
      node: createNoteTreeNode(note),
    };
  });

export const enterNoteNotFoundState = () =>
  mutate(({ state }, { noteId }: { noteId: string }) => {
    state.noteStore.notes[noteId] = {
      mode: "NOT_FOUND",
      id: noteId,
      node: null,
    };
  });
