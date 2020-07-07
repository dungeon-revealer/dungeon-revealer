import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as db from "./notes-db";
import { pipe } from "fp-ts/lib/pipeable";
import uuid from "uuid/v4";
import sanitizeHtml from "sanitize-html";
import showdown from "showdown";

type ViewerRole = "admin" | "user";

export type NoteModelType = db.NoteModelType;
export const decodeNote = db.decodeNote;
export const NoteModel = db.NoteModel;

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

const sanitizeNoteContent = (content: string) => {
  const [, ...contentLines] = content.split("\n");

  const converter = new showdown.Converter({
    tables: true,
  });
  const sanitizedContent = sanitizeHtml(
    converter.makeHtml(contentLines.join("\n")),
    {
      allowedTags: [],
    }
  );

  return sanitizedContent;
};

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

export const getPaginatedNotes = ({ first }: { first: number }) =>
  pipe(
    checkAdmin(null),
    RTE.chainW(() => db.getPaginatedNotes({ maximumAmountOfRecords: first }))
  );

export const getMorePaginatedNotes = ({
  first,
  lastCreatedAt,
  lastId,
}: {
  first: number;
  lastCreatedAt: number;
  lastId: string;
}) =>
  pipe(
    checkAdmin(null),
    RTE.chainW(() =>
      db.getMorePaginatedNotes({
        lastCreatedAt,
        lastId,
        maximumAmountOfRecords: first,
      })
    )
  );

export const createNote = ({
  title,
  content,
  isEntryPoint,
}: {
  title: string;
  content: string;
  isEntryPoint: boolean;
}) =>
  pipe(
    checkAdmin({ title, content }),
    RTE.chainW(() =>
      db.updateOrInsertNote({
        id: uuid(),
        title,
        content,
        access: "admin",
        sanitizedContent: sanitizeNoteContent(content),
        isEntryPoint,
      })
    )
  );

export const updateNoteContent = ({
  id,
  content,
}: {
  id: string;
  content: string;
}) =>
  pipe(
    checkAdmin(null),
    RTE.chainW(() => db.getNoteById(id)),
    RTE.chainW((note) =>
      db.updateOrInsertNote({
        id,
        title: note.title,
        content,
        access: note.type,
        sanitizedContent: sanitizeNoteContent(content),
        isEntryPoint: note.isEntryPoint,
      })
    )
  );

export const updateNoteTitle = ({ id, title }: { id: string; title: string }) =>
  pipe(
    checkAdmin(null),
    RTE.chainW(() => db.getNoteById(id)),
    RTE.chainW((note) =>
      db.updateOrInsertNote({
        id,
        title,
        content: note.content,
        access: note.type,
        sanitizedContent: sanitizeNoteContent(note.content),
        isEntryPoint: note.isEntryPoint,
      })
    )
  );

export const deleteNote = (noteId: string) =>
  pipe(checkAdmin(noteId), RTE.chainW(db.deleteNote));

export const findPublicNotes = (query: string) =>
  pipe(
    RTE.ask<{ viewerRole: ViewerRole }>(),
    RTE.chainW((d) => {
      switch (d.viewerRole) {
        case "admin":
          return db.findAllNotes(query);
        case "user":
          return db.findPublicNotes(query);
      }
    })
  );
