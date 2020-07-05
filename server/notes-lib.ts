import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as db from "./notes-db";
import { pipe } from "fp-ts/lib/pipeable";
import { flow } from "lodash";

type ViewerRole = "admin" | "user";

export type NoteModelType = db.NoteModelType;
export const decodeNote = db.decodeNote;

export type NoteSearchMatchType = db.NoteSearchMatchType;

const isAdmin = (viewerRole: ViewerRole) => viewerRole === "admin";

const checkAdmin = <T>(
  input: T
): RTE.ReaderTaskEither<{ viewerRole: ViewerRole }, Error, T> => ({
  viewerRole,
}) =>
  isAdmin(viewerRole)
    ? TE.right(input)
    : TE.left(new Error("Insufficient permissions."));

export const getNoteById = (id: string) =>
  pipe(
    db.getNoteById(id),
    RTE.chainW((note) => {
      switch (note.type) {
        case "admin":
          return checkAdmin(note);
        case "public":
          return RTE.right(note);
        default:
          return RTE.left(new Error("Insufficient permissions."));
      }
    })
  );

export const getPaginatedNotes = flow(
  checkAdmin,
  RTE.chainW(() => db.getPaginatedNotes())
);

export const createNote = ({
  title,
  content,
}: {
  title: string;
  content: string;
}) => pipe(checkAdmin({ title, content }), RTE.chainW(db.createNote));

export const updateNote = ({
  id,
  title,
  content,
}: {
  id: string;
  title: string;
  content: string;
}) => pipe(checkAdmin({ id, title, content }), RTE.chainW(db.updateNote));

export const deleteNote = (noteId: string) =>
  pipe(checkAdmin(noteId), RTE.chainW(db.deleteNote));

export const findPublicNotes = db.findPublicNotes;
