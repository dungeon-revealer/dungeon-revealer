import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import { flow } from "fp-ts/lib/function";
import { pipe } from "fp-ts/lib/pipeable";
import toCamelCase from "lodash/camelCase";
import isObject from "lodash/isObject";
import * as t from "io-ts";
import type { Database } from "sqlite";

const BooleanFromNumber = new t.Type(
  "BooleanFromNumber",
  (input: unknown): input is boolean => typeof input === "boolean",
  (input, context) =>
    pipe(
      t.number.validate(input, context),
      E.chain((value) => {
        return t.success(Boolean(value));
      })
    ),
  (value) => (value ? 1 : 0)
);

export const NoteModel = t.type({
  id: t.string,
  title: t.string,
  content: t.string,
  type: t.union([t.literal("admin"), t.literal("public")]),
  isEntryPoint: BooleanFromNumber,
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
          "is_entry_point",
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

export const getPaginatedNotes = ({
  maximumAmountOfRecords,
}: {
  maximumAmountOfRecords: number;
}): RTE.ReaderTaskEither<
  { db: Database },
  Error | t.Errors,
  NoteModelType[]
> => ({ db }) =>
  pipe(
    TE.tryCatch(
      () =>
        db.all(
          /* SQL */ `
            SELECT
              "id",
              "title",
              "content",
              "type",
              "is_entry_point",
              "created_at",
              "updated_at"
            FROM "notes"
            WHERE
              "is_entry_point" = 1
            ORDER BY
              "created_at" DESC,
              "id" DESC
            LIMIT ?
            ;
          `,
          maximumAmountOfRecords
        ),
      E.toError
    ),
    TE.chainW(decodeNoteList)
  );

export const getMorePaginatedNotes = ({
  lastCreatedAt,
  lastId,
  maximumAmountOfRecords,
}: {
  lastCreatedAt: number;
  lastId: string;
  maximumAmountOfRecords: number;
}): RTE.ReaderTaskEither<
  { db: Database },
  Error | t.Errors,
  NoteModelType[]
> => ({ db }) =>
  pipe(
    TE.tryCatch(
      () =>
        db.all(
          /* SQL */ `
            SELECT
              "id",
              "title",
              "content",
              "type",
              "is_entry_point",
              "created_at",
              "updated_at"
            FROM
              "notes"
            WHERE
              "created_at" <= ?
              AND "id" < ?
              AND "is_entry_point" = 1
            ORDER BY
              "created_at" DESC,
              "id" DESC
            LIMIT ?
            ;
          `,
          lastCreatedAt,
          lastId,
          maximumAmountOfRecords
        ),
      E.toError
    ),
    TE.chainW(decodeNoteList)
  );

export const deleteNote = (
  noteId: string
): RTE.ReaderTaskEither<{ db: Database }, Error | t.Errors, string> => ({
  db,
}) =>
  pipe(
    TE.tryCatch(async () => {
      await db.run(
        /* SQL */ `
          DELETE FROM "notes"
          WHERE
            "id" = ?
          ;
        `,
        noteId
      );
      await db.run(
        /* SQL */ `
          DELETE
          FROM "notes_search"
          WHERE
            "id" = ?
          ;
        `,
        noteId
      );
    }, E.toError),
    TE.map(() => noteId)
  );

export const updateOrInsertNote = (record: {
  id: string;
  title: string;
  content: string;
  sanitizedContent: string;
  access: "public" | "admin";
  isEntryPoint: boolean;
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
            "is_entry_point",
            "created_at",
            "updated_at"
          ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            COALESCE((SELECT "created_at" FROM "notes" WHERE id = ?), ?),
            ?
          );
        `,
        record.id,
        record.title,
        record.content,
        record.access,
        BooleanFromNumber.encode(record.isEntryPoint),
        record.id,
        getTimestamp(),
        getTimestamp()
      );

      await db.run(
        /* SQL */ `
          INSERT OR REPLACE INTO "notes_search" (
            "rowid",
            "id",
            "title",
            "content",
            "access"
          ) VALUES (
            COALESCE((SELECT "rowid" FROM "notes_search" WHERE id = ?), NULL),
            ?,
            ?,
            ?,
            ?
          );
        `,
        record.id,
        record.id,
        record.title,
        record.sanitizedContent,
        record.access
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

export const findAllNotes = (
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
          snippet("notes_search", 2, '!', '!', "...", 16) as "preview"
        FROM "notes_search"
        WHERE
          (
            "title" MATCH ?
            OR "content" MATCH ?
          )
        LIMIT 10
        ;
      `,
          `"${query}"*`,
          `"${query}"*`
        ),
      E.toError
    ),
    TE.chainW(flow(decodeNoteSearchMatchList, TE.fromEither))
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
            snippet("notes_search", 2, '!', '!', "...", 16) as "preview"
          FROM "notes_search"
          WHERE
            (
              "title" MATCH ?
              OR "content" MATCH ?
            )
            AND
              "access" MATCH ?
          LIMIT 10
          ;
        `,
          `"${query}"*`,
          `"${query}"*`,
          `"public"`
        ),
      E.toError
    ),
    TE.chainW(flow(decodeNoteSearchMatchList, TE.fromEither))
  );
