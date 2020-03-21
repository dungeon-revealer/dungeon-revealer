import { mutate, Operator, filter } from "overmind";
import { NoteType } from "../note-store/note-store-state";
import {
  createActiveState,
  createNoneState
} from "./select-token-marker-reference-modal-state";
import * as u from "../util";
import { switchMap } from "../operators";

export const openModal = () =>
  mutate(({ state }, { tokenId }: { tokenId: string }) => {
    state.selectTokenMarkerReferenceModal = u.castTreeNode(
      createActiveState({ tokenId })
    );
  });

export const closeModal = (): Operator =>
  mutate(({ state }) => {
    state.selectTokenMarkerReferenceModal = u.castTreeNode(createNoneState());
  });

export const setActiveNote = () =>
  mutate(({ state }, note: NoteType) => {
    if (state.selectTokenMarkerReferenceModal.mode !== "ACTIVE") return;
    state.selectTokenMarkerReferenceModal.activeNoteId = note.id;
  });

export const skipIfNotOpened = () =>
  filter(
    ({ state }) => state.selectTokenMarkerReferenceModal.mode !== "ACTIVE"
  );

export const createNewNote = (): Operator<void, string> =>
  switchMap(({ actions }) => {
    return actions.noteStore.createNote({ title: "New Note", content: "" });
  });
