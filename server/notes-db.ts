import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import { flow } from "fp-ts/lib/function";
import { pipe } from "fp-ts/lib/pipeable";
import toCamelCase from "lodash/camelCase";
import isObject from "lodash/isObject";
import uuid from "uuid/v4";
import * as t from "io-ts";
import type { Database } from "sqlite";

const NoteModel = t.type({
  id: t.string,
  title: t.string,
  content: t.string,
  type: t.union([t.literal("admin"), t.literal("public")]),
  createdAt: t.number,
  updatedAt: t.number,
});

export type NoteModelType = t.TypeOf<typeof NoteModel>;
const NoteModelList = t.array(NoteModel);

const getTimestamp = () => new Date().getTime();

const camelCaseKeys = flow(
  Object.entries,
  (entries) => entries.map(([key, value]) => [toCamelCase(key), value]),
  Object.fromEntries
);

export const decodeNote = flow(
  (obj) => (isObject(obj) ? camelCaseKeys(obj) : obj),
  NoteModel.decode
);

const decodeNoteList = flow(
  (sth) =>
    Array.isArray(sth)
      ? sth.map((obj) => (isObject(obj) ? camelCaseKeys(obj) : obj))
      : sth,
  NoteModelList.decode,
  TE.fromEither
);

export const getNoteById = (
  id: string
): RTE.ReaderTaskEither<{ db: Database }, Error | t.Errors, NoteModelType> => ({
  db,
}) =>
  pipe(
    TE.tryCatch(
      () =>
        db.get(
          /* SQL */ `
        SELECT
          "id",
          "title",
          "content",
          "type",
          "created_at",
          "updated_at"
        FROM "notes"
        WHERE
          "id" = ?;
      `,
          id
        ),
      E.toError
    ),
    TE.chainW(flow(decodeNote, TE.fromEither))
  );

export const getPaginatedNotes = (): RTE.ReaderTaskEither<
  { db: Database },
  Error | t.Errors,
  NoteModelType[]
> => ({ db }) =>
  pipe(
    TE.tryCatch(
      () =>
        db.all(/* SQL */ `
          SELECT
            "id",
            "title",
            "content",
            "type",
            "created_at",
            "updated_at"
          FROM "notes"
          WHERE
            "type" = 'admin'
          ORDER BY
            "created_at" DESC
          ;
    `),
      E.toError
    ),
    TE.chainW(decodeNoteList)
  );

export const createNote = ({
  title,
  content,
}: {
  title: string;
  content: string;
}): RTE.ReaderTaskEither<{ db: Database }, Error | t.Errors, string> => ({
  db,
}) => {
  const id = uuid();
  const timestamp = getTimestamp();
  return pipe(
    TE.tryCatch(
      () =>
        db.run(
          /* SQL */ `
          INSERT INTO "notes" (
           "id",
           "title",
           "content",
           "created_at",
           "updated_at"
          ) VALUES (?, ?, ?, ?, ?);
        `,
          id,
          title,
          content,
          timestamp,
          timestamp
        ),
      E.toError
    ),
    TE.map(() => id)
  );
};

export const updateNote = ({
  id,
  title,
  content,
}: {
  id: string;
  title: string;
  content: string;
}): RTE.ReaderTaskEither<{ db: Database }, Error | t.Errors, string> => ({
  db,
}) =>
  pipe(
    TE.tryCatch(
      () =>
        db.run(
          /* SQL */ `
          UPDATE "notes"
          SET
            "title" = ?,
            "content" = ?
          WHERE "id" = ?;
          `,
          title,
          content,
          id
        ),
      E.toError
    ),
    TE.map(() => id)
  );

export const deleteNote = (
  noteId: string
): RTE.ReaderTaskEither<{ db: Database }, Error | t.Errors, string> => ({
  db,
}) =>
  pipe(
    TE.tryCatch(
      () =>
        db.run(
          /* SQL */ `
          DELETE FROM "notes"
          WHERE
            "id" = ?
          ;
        `,
          noteId
        ),
      E.toError
    ),
    TE.map(() => noteId)
  );

// TODO: How should people import public notes?
// Ideally, they could drag and drop a zip into dungeon-revealer
export const updateOrInsertPublicNote = (record: {
  id: string;
  title: string;
  content: string;
  sanitizedContent: string;
}): RTE.ReaderTaskEither<{ db: Database }, Error | t.Errors, string> => ({
  db,
}) =>
  pipe(
    TE.tryCatch(async () => {
      await db.run(
        /* SQL */ `
          INSERT OR REPLACE INTO "notes" (
            "id",
            "title",
            "content",
            "type",
            "created_at",
            "updated_at"
          ) VALUES (
              ?,
              ?,
              ?,
              'public',
              COALESCE((SELECT "created_at" FROM "notes" WHERE id = ?), ?),
              ?
          );
        `,
        record.id,
        record.title,
        record.content,
        record.id,
        getTimestamp(),
        getTimestamp()
      );

      await db.run(
        /* SQL */ `
          INSERT OR REPLACE INTO "notes_search_public" (
            "rowid",
            "id",
            "title",
            "content"
          ) VALUES (
            COALESCE((SELECT "rowid" FROM "notes_search_public" WHERE id = ?), NULL),
            ?,
            ?,
            ?
          );
        `,
        record.id,
        record.id,
        record.title,
        record.sanitizedContent
      );
    }, E.toError),
    TE.map(() => record.id)
  );

export const NoteSearchMatch = t.type(
  {
    noteId: t.string,
    title: t.string,
    preview: t.string,
  },
  "SearchMatch"
);

export type NoteSearchMatchType = t.TypeOf<typeof NoteSearchMatch>;

export const NoteSearchMatchList = t.array(NoteSearchMatch);

type NoteSearchMatchListType = t.TypeOf<typeof NoteSearchMatchList>;

export const decodeNoteSearchMatchList = flow(
  (obj) =>
    Array.isArray(obj)
      ? obj.map((obj) => (isObject(obj) ? camelCaseKeys(obj) : obj))
      : obj,
  NoteSearchMatchList.decode
);

export const findPublicNotes = (
  query: string
): RTE.ReaderTaskEither<
  { db: Database },
  Error | t.Errors,
  NoteSearchMatchListType
> => ({ db }) =>
  pipe(
    TE.tryCatch(
      () =>
        db.all(
          /* SQL */ `
          SELECT
            "id" as "note_id",
            "title",
            snippet("notes_search_public", 2, '!', '!', "...", 16) as "preview"
          FROM "notes_search_public"
          WHERE
            "title" MATCH ? OR
            "content" MATCH ?
          LIMIT 10
          ;
        `,
          `"${query}"*`,
          `"query"*`
        ),
      E.toError
    ),
    TE.chainW(flow(decodeNoteSearchMatchList, TE.fromEither))
  );
