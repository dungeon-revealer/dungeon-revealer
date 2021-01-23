import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import { v4 as uuid } from "uuid";
import sanitizeHtml from "sanitize-html";
import showdown from "showdown";
import * as db from "./notes-db";
import * as noteImport from "./note-import";
import type { SocketSessionRecord } from "./socket-session-store";

type ViewerRole = "unauthenticated" | "admin" | "user";

export type NoteModelType = db.NoteModelType;
export const decodeNote = db.decodeNote;
export const NoteModel = db.NoteModel;

export type NoteSearchMatchType = db.NoteSearchMatchType;

type SessionDependency = { session: SocketSessionRecord };

const isAdmin = (viewerRole: ViewerRole) => viewerRole === "admin";

const checkAdmin = (): RTE.ReaderTaskEither<SessionDependency, Error, void> => (
  d
) =>
  isAdmin(d.session.role)
    ? TE.right(undefined)
    : TE.left(new Error("Insufficient permissions."));

const checkAuthenticated = (): RTE.ReaderTaskEither<
  SessionDependency,
  Error,
  void
> =>
  pipe(
    RTE.ask<SessionDependency>(),
    RTE.chain((d) =>
      d.session.role === "unauthenticated"
        ? RTE.left(new Error("Unauthenticated access."))
        : RTE.right(undefined)
    )
  );

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
    checkAuthenticated(),
    RTE.chainW(() => db.getNoteById(id)),
    RTE.chainW((note) => {
      switch (note.type) {
        case "admin":
          return pipe(
            checkAdmin(),
            RTE.map(() => note)
          );
        case "public":
          return RTE.right(note);
        default:
          return RTE.left(new Error("Insufficient permissions."));
      }
    })
  );

export const getPaginatedNotes = ({
  first,
  onlyEntryPoints,
  cursor,
}: {
  /* amount of items to fetch */
  first: number;
  /* whether only public notes should be returned */
  /* whether only entrypoints should be returned */
  onlyEntryPoints: boolean;
  /* cursor which can be used to fetch more */
  cursor: null | {
    /* createdAt date of the item after which items should be fetched */
    lastCreatedAt: number;
    /* id of the item after which items should be fetched */
    lastId: string;
  };
}) =>
  pipe(
    checkAuthenticated(),
    RTE.chainW(() => RTE.ask<{ session: SocketSessionRecord }>()),
    RTE.chainW(({ session }) =>
      db.getPaginatedNotes({
        first,
        onlyPublic: session.role === "user",
        onlyEntryPoints,
        cursor,
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
    checkAdmin(),
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
    checkAdmin(),
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
    checkAdmin(),
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
    checkAdmin(),
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
    checkAdmin(),
    RTE.chainW(() => db.deleteNote(noteId))
  );

export const findPublicNotes = (query: string) =>
  pipe(
    checkAuthenticated(),
    RTE.chainW(() => RTE.ask<SessionDependency>()),
    RTE.chainW((d) => db.searchNotes(query, d.session.role === "user"))
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
