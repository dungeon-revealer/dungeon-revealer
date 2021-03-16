import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import * as A from "fp-ts/lib/Array";
import { flow, identity } from "fp-ts/lib/function";
import { pipe } from "fp-ts/lib/pipeable";
import * as t from "io-ts";
import type { Database } from "sqlite";
import { camelCaseKeys } from "./util/camelcase-keys";
import { JSONFromString } from "./io-types/json-from-string";

const getTimestamp = () => new Date().getTime();

const LinkedNoteModel = t.type(
  {
    type: t.literal("note"),
    id: t.string,
  },
  "LinkedNote"
);

const LinkedResourceModel = t.union(
  [t.null, LinkedNoteModel],
  "LinkedResource"
);

type LinkedResourceType = t.TypeOf<typeof LinkedResourceModel>;

const LinkedResourceFromJSONString = new t.Type<LinkedResourceType, string>(
  "LinkedResourceFromJSONString",
  LinkedResourceModel.is,
  (input, context) =>
    pipe(
      JSONFromString.validate(input, context),
      E.chain((value) => LinkedResourceModel.validate(value, context))
    ),
  flow(
    (value) => E.stringifyJSON(value, E.toError),
    // TODO: log error so we know something is wrong
    E.fold((_err) => "null", identity)
  )
);

export const LibraryTokenModel = t.type(
  {
    id: t.string,
    title: t.string,
    color: t.string,
    size: t.number,
    label: t.string,
    resource: LinkedResourceFromJSONString,
    createdAt: t.number,
    updatedAt: t.number,
  },
  "LibraryToken"
);

type LibraryTokenModelType = t.TypeOf<typeof LibraryTokenModel>;
type LibraryTokenModelListType = Array<LibraryTokenModelType>;

const decodeLibraryToken = flow(
  t.UnknownRecord.decode,
  E.map(camelCaseKeys),
  E.chain(LibraryTokenModel.decode)
);

const decodeLibraryTokenList = flow(
  t.UnknownArray.decode,
  E.chain((arr) =>
    A.sequence(E.either)(arr.map((element) => decodeLibraryToken(element)))
  )
);

type DecodeError = Error | t.Errors;
type Dependencies = {
  db: Database;
};

export const createOrUpdateLibraryToken: (params: {
  id: string;
  title: string;
  color: string;
  size: number;
  label: string;
  resource: LinkedResourceType;
}) => RTE.ReaderTaskEither<Dependencies, DecodeError, string> = (params) => (
  deps
) =>
  pipe(
    TE.tryCatch(
      () =>
        deps.db.run(
          /* SQL */ `
            INSERT OR REPLACE INTO "library_tokens" (
              "id",
              "title",
              "color",
              "size",
              "label",
              "resource",
              "created_at",
              "updated_at"
            ) VALUES (
              $id,
              $title,
              $color,
              $size,
              $label,
              $resource,
              COALESCE((SELECT "created_at" FROM "library_tokens" WHERE id = $id), $created_at),
              $updated_at
            );
          `,
          {
            $id: params.id,
            $title: params.title,
            $color: params.color,
            $size: params.size,
            $label: params.label,
            $resource: LinkedResourceFromJSONString.encode(params.resource),
            $created_at: getTimestamp(),
            $updated_at: getTimestamp(),
          }
        ),
      E.toError
    ),
    TE.map(() => params.id)
  );

export const deleteLibraryTokenById: (
  tokenId: string
) => RTE.ReaderTaskEither<Dependencies, DecodeError, boolean> = (tokenId) => (
  deps
) =>
  pipe(
    TE.tryCatch(
      () =>
        deps.db.run(
          /* SQL */ `
          DELETE
          FROM "library_tokens"
          WHERE
            "id" = $id
          ;
        `,
          {
            $id: tokenId,
          }
        ),
      E.toError
    ),
    TE.map(() => true)
  );

export const getLibraryTokenById: (
  id: string
) => RTE.ReaderTaskEither<Dependencies, DecodeError, LibraryTokenModelType> = (
  id: string
) => (deps: Dependencies) =>
  pipe(
    TE.tryCatch(
      () =>
        deps.db.get(
          /* SQL */ `
            SELECT
             "id",
             "title",
             "color",
             "size",
             "label",
             "createdAt",
             "updatedAt"
            FROM
             "library_tokens"
            WHERE
              "id" = $id
            ;
          `,
          {
            $id: id,
          }
        ),
      E.toError
    ),
    TE.chainW(flow(decodeLibraryToken, TE.fromEither))
  );

export const getPaginatedLibraryTokens: (params: {
  /* amount of items to fetch */
  first: number;
}) => RTE.ReaderTaskEither<
  Dependencies,
  DecodeError,
  LibraryTokenModelListType
> = (params) => (deps) =>
  pipe(
    TE.tryCatch(
      () =>
        deps.db.all(
          /* SQL */ `
            SELECT
              "id",
              "title",
              "color",
              "size",
              "label",
              "createdAt",
              "updatedAt"
            FROM
              "library_tokens"
            ORDER BY
              "created_at" DESC,
              "id" DESC
            LIMIT $first
            ;
          `,
          {
            $first: params.first,
          }
        ),
      E.toError
    ),
    TE.chainW(flow(decodeLibraryTokenList, TE.fromEither))
  );

export const getMorePaginatedLibraryTokens: (params: {
  /* createdAt date of the item after which items should be fetched */
  lastCreatedAt: number;
  /* id of the item after which items should be fetched */
  lastId: number;
  /* amount of items to fetch */
  first: number;
}) => RTE.ReaderTaskEither<
  Dependencies,
  DecodeError,
  LibraryTokenModelListType
> = (params) => (deps) =>
  pipe(
    TE.tryCatch(
      () =>
        deps.db.all(
          /* SQL */ `
            SELECT
              "id",
              "title",
              "color",
              "size",
              "label",
              "createdAt",
              "updatedAt"
            FROM
              "library_tokens"
            ORDER BY
              "created_at" DESC,
              "id" DESC
            LIMIT $first
            WHERE
              "created_at" <= $last_created_at
              AND "id" < $last_id
            ;
          `,
          {
            $first: params.first,
            $last_created_at: params.lastCreatedAt,
            $last_id: params.lastId,
          }
        ),
      E.toError
    ),
    TE.chainW(flow(decodeLibraryTokenList, TE.fromEither))
  );
