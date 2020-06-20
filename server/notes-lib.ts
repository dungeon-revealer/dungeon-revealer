import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as db from "./notes-db";
import { pipe } from "fp-ts/lib/pipeable";

type ViewerRole = "admin" | "user";

export type NoteModelType = db.NoteModelType;
export const decodeNote = db.decodeNote;

export type NoteSearchMatchType = db.NoteSearchMatchType;

const isAdmin = (viewerRole: ViewerRole) => viewerRole === "admin";

const checkAdmin = (): RTE.ReaderTaskEither<
  { viewerRole: ViewerRole },
  Error,
  void
> => ({ viewerRole }) =>
  isAdmin(viewerRole)
    ? TE.right(undefined)
    : TE.left(new Error("Insufficient permissions."));

export const getNoteById = (id: string) =>
  pipe(
    checkAdmin(),
    RTE.chainW(() => db.getNoteById(id))
  );

export const getPaginatedNotes = () =>
  pipe(
    checkAdmin(),
    RTE.chainW(() => db.getPaginatedNotes())
  );

export const createNote = ({
  title,
  content,
}: {
  title: string;
  content: string;
}) =>
  pipe(
    checkAdmin(),
    RTE.chainW(() => db.createNote({ title, content }))
  );

export const updateNote = ({
  id,
  title,
  content,
}: {
  id: string;
  title: string;
  content: string;
}) =>
  pipe(
    checkAdmin(),
    RTE.chainW(() => db.updateNote({ id, title, content }))
  );

export const deleteNote = (noteId: string) =>
  pipe(
    checkAdmin(),
    RTE.chainW(() => db.deleteNote(noteId))
  );

export const findPublicNotes = db.findPublicNotes;
