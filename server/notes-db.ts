import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import * as A from "fp-ts/lib/Array";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import type { Database } from "sqlite";
import { camelCaseKeys } from "./util/camelcase-keys";
import { BooleanFromNumber } from "./io-types/boolean-from-number";
import * as sql from "./sql";

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

const MaybeUnknownRecord = t.union(
  [t.null, t.undefined, t.UnknownRecord],
  "MaybeUnknownRecord"
);

export const decodeMaybeNote: (
  input: unknown
) => E.Either<DecodeError, NoteModelType | null> = flow(
  MaybeUnknownRecord.decode,
  E.chain((value) =>
    value == null ? E.right(null) : NoteModel.decode(camelCaseKeys(value))
  )
);

const decodeNoteList: (
  input: unknown
) => E.Either<DecodeError, NodeModelListType> = flow(
  t.UnknownArray.decode,
  E.chain((arr) =>
    A.sequence(E.either)(arr.map((element) => decodeNote(element)))
  )
);

export const getNoteById =
  (
    id: string
  ): RTE.ReaderTaskEither<Dependencies, DecodeError, NoteModelType> =>
  ({ db }) =>
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

export const getMaybeNoteById =
  (
    id: string
  ): RTE.ReaderTaskEither<Dependencies, DecodeError, NoteModelType | null> =>
  ({ db }) =>
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
      TE.chainW(flow(decodeMaybeNote, TE.fromEither))
    );

export const getPaginatedNotes =
  (params: {
    /* amount of items to fetch */
    first: number;
    /* whether only public notes should be returned */
    onlyPublic: boolean;
    /* whether only entrypoints should be returned */
    onlyEntryPoints: boolean;
    /* cursor which can be used to fetch more */
    cursor: null | {
      /* createdAt date of the item after which items should be fetched */
      lastCreatedAt: number;
      /* id of the item after which items should be fetched */
      lastId: string;
    };
  }): RTE.ReaderTaskEither<Dependencies, DecodeError, NodeModelListType> =>
  ({ db }) =>
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
            ${sql.whereAnd(
              params.cursor
                ? `("created_at" < $last_created_at OR ("created_at" = $last_created_at AND "id" < $last_id))`
                : null,
              params.onlyEntryPoints ? `"is_entry_point" = 1` : null,
              params.onlyPublic ? `"type" = 'public'` : null
            )}
            ORDER BY
              "created_at" DESC,
              "id" DESC
            LIMIT $first
            ;
          `,
            {
              $last_created_at: params.cursor?.lastCreatedAt,
              $last_id: params.cursor?.lastId,
              $first: params.first,
            }
          ),
        E.toError
      ),
      TE.chainW(flow(decodeNoteList, TE.fromEither))
    );

export const deleteNote =
  (noteId: string): RTE.ReaderTaskEither<Dependencies, DecodeError, string> =>
  ({ db }) =>
    pipe(
      TE.tryCatch(async () => {
        await db.run(
          /* SQL */ `
          DELETE FROM "notes"
          WHERE
            "id" = $id
          ;
        `,
          {
            $id: noteId,
          }
        );
        await db.run(
          /* SQL */ `
          DELETE
          FROM "notes_search"
          WHERE
            "id" = $id
          ;
        `,
          {
            $id: noteId,
          }
        );
      }, E.toError),
      TE.map(() => noteId)
    );

export const updateOrInsertNote =
  (record: {
    id: string;
    title: string;
    content: string;
    sanitizedContent: string;
    access: "public" | "admin";
    isEntryPoint: boolean;
  }): RTE.ReaderTaskEither<Dependencies, Error, string> =>
  ({ db }) =>
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
            $id,
            $title,
            $content,
            $type,
            $is_entry_point,
            COALESCE((SELECT "created_at" FROM "notes" WHERE id = $id), $created_at),
            $updated_at
          );
        `,
          {
            $id: record.id,
            $title: record.title,
            $content: record.content,
            $type: record.access,
            $is_entry_point: BooleanFromNumber.encode(record.isEntryPoint),
            $created_at: getTimestamp(),
            $updated_at: getTimestamp(),
          }
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
            COALESCE((SELECT "rowid" FROM "notes_search" WHERE id = $id), NULL),
            $id,
            $title,
            $sanitized_content,
            $access
          );
        `,
          {
            $id: record.id,
            $title: record.title,
            $sanitized_content: record.sanitizedContent,
            $access: record.access,
          }
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

export const searchNotes =
  (
    query: string,
    onlyPublic: boolean
  ): RTE.ReaderTaskEither<Dependencies, DecodeError, NoteSearchMatchListType> =>
  ({ db }) =>
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
            "notes_search" MATCH $query
          ORDER BY
            bm25("notes_search", 1.0, 100.0, 0.0) ASC
          LIMIT 10
          ;
        `,
            {
              $query: `(title:"${query}" OR (title:"${query}"* OR content:"${query}"*))${
                onlyPublic ? ` AND access:"public"` : ""
              }`,
            }
          ),
        E.toError
      ),
      TE.chainW(flow(decodeNoteSearchMatchList, TE.fromEither))
    );
