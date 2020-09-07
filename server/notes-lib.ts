import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RE from "fp-ts/lib/ReaderEither";

import { flow, pipe } from "fp-ts/lib/function";
import { v4 as uuid } from "uuid";
import sanitizeHtml from "sanitize-html";
import showdown from "showdown";
import * as db from "./notes-db";
import * as permissions from "./permissions";
import * as noteImport from "./note-import";
import type { SocketSessionRecord } from "./socket-session-store";

export type NoteModelType = db.NoteModelType;
export const decodeNote = db.decodeNote;
export const NoteModel = db.NoteModel;

export type NoteSearchMatchType = db.NoteSearchMatchType;

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
    RTE.chainW(
      flow((note) => {
        switch (note.type) {
          case "admin":
            return permissions.checkAdmin(note);
          case "public":
            return RE.right(note);
          default:
            return RE.left(new Error("Insufficient permissions."));
        }
      }, RTE.fromReaderEither)
    )
  );

export const getPaginatedNotes = ({ first }: { first: number }) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
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
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
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
    permissions.checkAdmin({ title, content }),
    RTE.fromReaderEither,
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
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
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

export const updateNoteAccess = ({
  id,
  access,
}: {
  id: string;
  access: string;
}) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
    RTE.chainW(() =>
      pipe(db.NoteAccessTypeModel.decode(access), RTE.fromEither)
    ),
    RTE.chainW((access) =>
      pipe(
        db.getNoteById(id),
        RTE.chainW((note) =>
          db.updateOrInsertNote({
            id,
            title: note.title,
            content: note.content,
            access: access,
            sanitizedContent: sanitizeNoteContent(note.content),
            isEntryPoint: note.isEntryPoint,
          })
        )
      )
    )
  );

export const updateNoteTitle = ({ id, title }: { id: string; title: string }) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
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
  pipe(
    permissions.checkAdmin(noteId),
    RTE.fromReaderEither,
    RTE.chainW(db.deleteNote)
  );

export const findPublicNotes = (query: string) =>
  pipe(
    RTE.ask<{ session: SocketSessionRecord }>(),
    RTE.chainW((d) => {
      switch (d.session.role) {
        case "admin":
          return db.findAllNotes(query);
        case "user":
          return db.findPublicNotes(query);
        case "unauthenticated":
          return RTE.of([]);
      }
    })
  );

export const importNote = flow(
  noteImport.parseNoteData,
  RTE.fromEither,
  RTE.chainW((d) =>
    db.updateOrInsertNote({
      ...d,
      access: "public",
      isEntryPoint: d.isEntryPoint,
    })
  )
);
