import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import * as A from "fp-ts/lib/Array";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import type { Database } from "sqlite";
import { camelCaseKeys } from "./util/camelcase-keys";
import { BooleanFromNumber } from "./io-types/boolean-from-number";

export const NoteAccessTypeModel = t.union([
  t.literal("admin"),
  t.literal("public"),
]);

export const NoteModel = t.type({
  id: t.string,
  title: t.string,
  content: t.string,
  type: NoteAccessTypeModel,
  isEntryPoint: BooleanFromNumber,
  createdAt: t.number,
  updatedAt: t.number,
});

export type NoteModelType = t.TypeOf<typeof NoteModel>;
export type NodeModelListType = Array<NoteModelType>;

type DecodeError = Error | t.Errors;
type Dependencies = {
  db: Database;
};

const getTimestamp = () => new Date().getTime();

export const decodeNote: (
  input: unknown
) => E.Either<DecodeError, NoteModelType> = flow(
  t.UnknownRecord.decode,
  E.map(camelCaseKeys),
  E.chain(NoteModel.decode)
);

const decodeNoteList: (
  input: unknown
) => E.Either<DecodeError, NodeModelListType> = flow(
  t.UnknownArray.decode,
  E.chain((arr) =>
    A.sequence(E.either)(arr.map((element) => decodeNote(element)))
  )
);

export const getNoteById = (
  id: string
): RTE.ReaderTaskEither<Dependencies, DecodeError, NoteModelType> => ({ db }) =>
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
}): RTE.ReaderTaskEither<Dependencies, DecodeError, NodeModelListType> => ({
  db,
}) =>
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
    TE.chainW(flow(decodeNoteList, TE.fromEither))
  );

export const getMorePaginatedNotes = ({
  lastCreatedAt,
  lastId,
  maximumAmountOfRecords,
}: {
  lastCreatedAt: number;
  lastId: string;
  maximumAmountOfRecords: number;
}): RTE.ReaderTaskEither<Dependencies, DecodeError, NoteModelType[]> => ({
  db,
}) =>
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
    TE.chainW(flow(decodeNoteList, TE.fromEither))
  );

export const deleteNote = (
  noteId: string
): RTE.ReaderTaskEither<Dependencies, DecodeError, string> => ({ db }) =>
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
}): RTE.ReaderTaskEither<Dependencies, Error, string> => ({ db }) =>
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

type NoteSearchMatchListType = Array<NoteSearchMatchType>;

const decodeNoteSearchMatch = flow(
  t.UnknownRecord.decode,
  E.map(camelCaseKeys),
  E.chain(NoteSearchMatch.decode)
);

export const decodeNoteSearchMatchList: (
  input: unknown
) => E.Either<DecodeError, NoteSearchMatchListType> = flow(
  t.UnknownArray.decode,
  E.chain((arr) =>
    A.sequence(E.either)(arr.map((element) => decodeNoteSearchMatch(element)))
  )
);

export const findAllNotes = (
  query: string
): RTE.ReaderTaskEither<
  Dependencies,
  DecodeError,
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
            "notes_search" MATCH ?
          ORDER BY bm25("notes_search", 1.0, 100.0, 0.0) ASC
          LIMIT 10
          ;
        `,
          `(title:"${query}" OR (title:"${query}"* OR content:"${query}"*))`
        ),
      E.toError
    ),
    TE.chainW(flow(decodeNoteSearchMatchList, TE.fromEither))
  );

export const findPublicNotes = (
  query: string
): RTE.ReaderTaskEither<
  Dependencies,
  DecodeError,
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
            "notes_search" MATCH ?
          ORDER BY
            bm25("notes_search", 1.0, 100.0, 0.0) ASC
          LIMIT 10
          ;
        `,
          `(title:"${query}" OR (title:"${query}"* OR content:"${query}"*)) AND access:"public"`
        ),
      E.toError
    ),
    TE.chainW(flow(decodeNoteSearchMatchList, TE.fromEither))
  );
