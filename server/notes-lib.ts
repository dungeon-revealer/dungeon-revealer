import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import { v4 as uuid } from "uuid";
import sanitizeHtml from "sanitize-html";
import showdown from "showdown";
import * as db from "./notes-db";
import * as noteImport from "./note-import";
import type { SocketSessionRecord } from "./socket-session-store";
import * as AsyncIterator from "./util/async-iterator";
import { invalidateResources } from "./live-query-store";

type ViewerRole = "unauthenticated" | "admin" | "user";

export type NoteModelType = db.NoteModelType;
export const decodeNote = db.decodeNote;
export const NoteModel = db.NoteModel;

export type NoteSearchMatchType = db.NoteSearchMatchType;

export type SessionDependency = { session: SocketSessionRecord };

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
    ),
    RTE.chain(getNoteById),
    RTE.chainW((note) =>
      pipe(
        publishNotesUpdate({
          type: "NOTE_CREATED",
          noteId: note.id,
          createdAt: note.createdAt,
          isEntryPoint: note.isEntryPoint,
          access: note.type,
        }),
        RTE.map(() => note)
      )
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
          pipe(
            db.updateOrInsertNote({
              id,
              title: note.title,
              content: note.content,
              access: access,
              sanitizedContent: sanitizeNoteContent(note.content),
              isEntryPoint: note.isEntryPoint,
            }),
            RTE.chainW((noteId) =>
              pipe(
                note.type !== access
                  ? pipe(
                      publishNotesUpdate({
                        type: "NOTE_CHANGE_ACCESS",
                        noteId,
                        createdAt: note.createdAt,
                        access,
                        isEntryPoint: note.isEntryPoint,
                      }),
                      RTE.chainW(() => invalidateResources([`Note:${note.id}`]))
                    )
                  : RTE.right(undefined),
                RTE.map(() => noteId)
              )
            )
          )
        )
      )
    )
  );

const publishNotesUpdate = (payload: NotesUpdatesPayload) =>
  pipe(
    RTE.ask<NotesUpdatesDependency>(),
    RTE.chainW((deps) =>
      pipe(
        E.tryCatch(() => deps.notesUpdates.publish(payload), E.toError),
        RTE.fromEither
      )
    )
  );

export const updateNoteIsEntryPoint = ({
  id,
  isEntryPoint,
}: {
  id: string;
  isEntryPoint: boolean;
}) =>
  pipe(
    checkAdmin(),
    RTE.chainW(() =>
      pipe(
        db.getNoteById(id),
        RTE.chainW((note) =>
          pipe(
            db.updateOrInsertNote({
              id,
              title: note.title,
              content: note.content,
              access: note.type,
              sanitizedContent: sanitizeNoteContent(note.content),
              isEntryPoint,
            }),
            RTE.chainW((noteId) =>
              pipe(
                isEntryPoint !== note.isEntryPoint
                  ? publishNotesUpdate({
                      type: "NOTE_CHANGE_ENTRY_POINT",
                      noteId,
                      createdAt: note.createdAt,
                      access: note.type,
                      isEntryPoint: isEntryPoint,
                    })
                  : RTE.right(undefined),
                RTE.map(() => noteId)
              )
            )
          )
        )
      )
    )
  );

export const updateNoteTitle = ({ id, title }: { id: string; title: string }) =>
  pipe(
    checkAdmin(),
    RTE.chainW(() => db.getNoteById(id)),
    RTE.chainW((note) =>
      pipe(
        db.updateOrInsertNote({
          id,
          title,
          content: note.content,
          access: note.type,
          sanitizedContent: sanitizeNoteContent(note.content),
          isEntryPoint: note.isEntryPoint,
        }),
        RTE.chainW((noteId) =>
          pipe(
            title !== note.title
              ? publishNotesUpdate({
                  type: "NOTE_CHANGE_TITLE",
                  noteId,
                  createdAt: note.createdAt,
                  access: note.type,
                  isEntryPoint: note.isEntryPoint,
                })
              : RTE.right(undefined),
            RTE.map(() => noteId)
          )
        )
      )
    )
  );

export const deleteNote = (noteId: string) =>
  pipe(
    checkAdmin(),
    RTE.chainW(() => db.getNoteById(noteId)),
    RTE.chainW((note) =>
      pipe(
        publishNotesUpdate({
          type: "NOTE_DELETED",
          noteId: note.id,
          createdAt: note.createdAt,
          isEntryPoint: note.isEntryPoint,
          access: note.type,
        }),
        RTE.chainW(() => db.deleteNote(note.id))
      )
    )
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

interface NotesChangedAccessPayload {
  type: "NOTE_CHANGE_ACCESS";
  noteId: string;
  createdAt: number;
  access: "admin" | "public";
  isEntryPoint: boolean;
}

interface NotesChangedIsEntryPointPayload {
  type: "NOTE_CHANGE_ENTRY_POINT";
  noteId: string;
  createdAt: number;
  isEntryPoint: boolean;
  access: "admin" | "public";
}

interface NotesChangedTitlePayload {
  type: "NOTE_CHANGE_TITLE";
  noteId: string;
  createdAt: number;
  isEntryPoint: boolean;
  access: "admin" | "public";
}

interface NotesDeletedNotePayload {
  type: "NOTE_DELETED";
  noteId: string;
  createdAt: number;
  isEntryPoint: boolean;
  access: "admin" | "public";
}

interface NotesCreatedNotePayload {
  type: "NOTE_CREATED";
  noteId: string;
  createdAt: number;
  isEntryPoint: boolean;
  access: "admin" | "public";
}

export type NotesUpdatesPayload =
  | NotesChangedAccessPayload
  | NotesChangedIsEntryPointPayload
  | NotesChangedTitlePayload
  | NotesDeletedNotePayload
  | NotesCreatedNotePayload;

export interface NotesUpdates {
  subscribe: () => AsyncIterableIterator<NotesUpdatesPayload>;
  publish: (payload: NotesUpdatesPayload) => void;
}

interface NotesUpdatesDependency {
  notesUpdates: NotesUpdates;
}

interface NoteCursor {
  lastId: string;
  lastCreatedAt: number;
}

/**
 * Whether the cursor a is located after cursor b
 */
export const isAfterCursor = (a: NoteCursor, b: null | NoteCursor) => {
  if (b === null) {
    return false;
  }
  if (a.lastCreatedAt === b.lastCreatedAt) {
    return a.lastId > b.lastId;
  }
  if (a.lastCreatedAt > b.lastCreatedAt) {
    return false;
  }
  return true;
};

export const subscribeToNotesUpdates = (params: {
  mode: "all" | "entrypoint";
  cursor: null | {
    lastId: string;
    lastCreatedAt: number;
  };
  hasNextPage: boolean;
}) =>
  pipe(
    checkAuthenticated(),
    RTE.chainW(() => RTE.ask<NotesUpdatesDependency & SessionDependency>()),
    RTE.map((deps) =>
      pipe(
        deps.notesUpdates.subscribe(),
        // skip all events that are after our last cursor
        // as those notes are not relevant for the client
        AsyncIterator.filter(
          (payload) =>
            !isAfterCursor(
              {
                lastId: payload.noteId,
                lastCreatedAt: payload.createdAt,
              },
              params.cursor
            ) || !params.hasNextPage
        ),
        AsyncIterator.map((payload) => {
          const hasAccess =
            (payload.access === "admin" && deps.session.role === "admin") ||
            payload.access === "public";

          switch (payload.type) {
            case "NOTE_CHANGE_ACCESS": {
              if (
                (params.mode === "entrypoint" &&
                  payload.isEntryPoint === false) ||
                deps.session.role === "admin"
              ) {
                return {
                  addedNodeId: null,
                  updatedNoteId: null,
                  removedNoteId: null,
                  mode: params.mode,
                };
              }
              // deps.session.role === "user"
              return {
                addedNodeId:
                  payload.access === "public" ? payload.noteId : null,
                updatedNoteId: null,
                removedNoteId:
                  payload.access === "admin" ? payload.noteId : null,
                mode: params.mode,
              };
            }
            case "NOTE_CHANGE_ENTRY_POINT": {
              if (params.mode === "all") {
                return {
                  addedNodeId: null,
                  updatedNoteId: null,
                  removedNoteId: null,
                  mode: params.mode,
                };
              }

              return {
                addedNodeId:
                  hasAccess && payload.isEntryPoint ? payload.noteId : null,
                updatedNoteId: null,
                removedNoteId:
                  hasAccess && !payload.isEntryPoint ? payload.noteId : null,
                mode: params.mode,
              };
            }
            case "NOTE_CHANGE_TITLE": {
              if (
                params.mode === "entrypoint" &&
                payload.isEntryPoint === false
              ) {
                return {
                  addedNodeId: null,
                  updatedNoteId: null,
                  removedNoteId: null,
                  mode: params.mode,
                };
              }
              return {
                addedNodeId: null,
                updatedNoteId: hasAccess ? payload.noteId : null,
                removedNoteId: null,
                mode: params.mode,
              };
            }
            case "NOTE_CREATED": {
              if (
                params.mode === "entrypoint" &&
                payload.isEntryPoint === false
              ) {
                return {
                  addedNodeId: null,
                  updatedNoteId: null,
                  removedNoteId: null,
                  mode: params.mode,
                };
              }

              return {
                addedNodeId: hasAccess ? payload.noteId : null,
                updatedNoteId: null,
                removedNoteId: null,
                mode: params.mode,
              };
            }
            case "NOTE_DELETED": {
              if (
                params.mode === "entrypoint" &&
                payload.isEntryPoint === false
              ) {
                return {
                  addedNodeId: null,
                  updatedNoteId: null,
                  removedNoteId: null,
                  mode: params.mode,
                };
              }

              return {
                addedNodeId: null,
                updatedNoteId: null,
                removedNoteId: hasAccess ? payload.noteId : null,
                mode: params.mode,
              };
            }
          }
        }),
        // micro optimization for not sending empty payloads where every field is null to the client.
        AsyncIterator.filter(
          (value): value is typeof value =>
            value.addedNodeId !== null ||
            value.removedNoteId !== null ||
            value.updatedNoteId !== null
        )
      )
    )
  );
