import * as o from "./select-token-marker-reference-operators";
import { pipe } from "overmind";

export const setActiveNote = o.setActiveNote();
export const open = pipe(o.openModal(), o.loadAllNotes());
export const close = o.closeModal();
export const attachNewNote = pipe(o.skipIfNotOpened(), o.createNewNote());
