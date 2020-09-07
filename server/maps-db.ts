import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import { flow } from "fp-ts/lib/function";
import { pipe } from "fp-ts/lib/pipeable";
import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import { sequenceT } from "fp-ts/lib/Apply";
import * as A from "fp-ts/lib/Array";
import type { Database } from "sqlite";
import { camelCaseKeys } from "./utilities/camel-case-keys";

export const MapGrid = t.type(
  {
    color: t.string,
    sideLength: t.number,
    x: t.number,
    y: t.number,
    isVisibleForPlayers: t.boolean,
    isVisibleForDungeonMaster: t.boolean,
  },
  "MapGrid"
);

export const NoteReference = t.type(
  {
    type: t.literal("NoteReference"),
    id: t.string,
  },
  "NoteReference"
);

export const MapToken = t.type(
  {
    id: t.string,
    type: t.literal("MapToken"),
    x: t.number,
    y: t.number,
    radius: t.number,
    label: t.string,
    isLockedForDungeonMaster: t.boolean,
    isLockedForPlayers: t.boolean,
    isVisibleForPlayers: t.boolean,
    reference: t.union([NoteReference, t.null], "MaybeTokenReference"),
  },
  "MapToken"
);

export type MapTokenType = t.TypeOf<typeof MapToken>;

export const MapObjects = t.array(MapToken, "MapObjects");

export type MapObjectsType = t.TypeOf<typeof MapObjects>;

export const MapRecord = t.type(
  {
    id: t.string,
    type: t.literal("Map"),
    title: t.string,
    grid: t.union([MapGrid, t.null], "MaybeMapGrid"),
    objects: MapObjects,
    createdAt: t.number,
  },
  "Map"
);

export type MapRecordType = t.TypeOf<typeof MapRecord>;
export type MapGridType = t.TypeOf<typeof MapGrid>;

const JSONFromString = new t.Type(
  "JSONFromString",
  (input: unknown): input is E.Json => typeof input === "object",
  (input, context) =>
    pipe(
      t.string.validate(input, context),
      E.chain((value) =>
        E.parseJSON(
          value,
          () =>
            [
              {
                value,
                context,
                message: `Failed JSON parsing.`,
              },
            ] as t.Errors
        )
      )
    ),
  (value) => value
);

const sequenceTEither = sequenceT(E.either);

const MapRecordFromDatabaseRecord = new t.Type(
  "MapRecordFromDatabaseRecord",
  (input: unknown): input is MapRecordType =>
    pipe(
      MapRecord.decode(input),
      E.fold(
        () => true,
        () => false
      )
    ),
  (input, context) =>
    pipe(
      t.UnknownRecord.validate(input, context),
      E.map((value) => camelCaseKeys(value)),
      E.chain((record) =>
        pipe(
          sequenceTEither(
            JSONFromString.decode(record["grid"]),
            JSONFromString.decode(record["objects"])
          ),
          E.map(
            ([grid, objects]) =>
              ({
                type: "Map",
                ...record,
                objects,
                grid,
              } as t.TypeOf<t.AnyDictionaryType>)
          )
        )
      ),
      E.chain(MapRecord.decode),
      E.chain((value) => t.success(value))
    ),
  (value) => value
);

export const formatDecodeError = (errors: t.Errors) => {
  const lines = PathReporter.report(E.left(errors));
  return new Error(
    "Invalid task schema. \n" + lines.map((line) => `- ${line}`).join("\n")
  );
};

const decodeMapRecordFromDatabaseRecord = flow(
  MapRecordFromDatabaseRecord.decode,
  E.mapLeft(formatDecodeError),
  TE.fromEither
);

export const loadMapById = (params: {
  id: string;
}): RTE.ReaderTaskEither<{ db: Database }, Error, MapRecordType> => ({ db }) =>
  pipe(
    TE.tryCatch(
      () =>
        db.get<unknown>(
          /* SQL */ `
          SELECT
            "id",
            "title",
            "grid",
            "objects",
            "created_at"
          FROM "maps"
          WHERE
            "id" = ?
          ;
        `,
          params.id
        ),
      E.toError
    ),
    TE.chain(decodeMapRecordFromDatabaseRecord)
  );

const MapRecordList = t.array(MapRecord, "MapRecordList");
type MapRecordListType = t.TypeOf<typeof MapRecordList>;

const MapRecordListFromDatabaseRecord = new t.Type(
  "MapRecordListFromDatabaseRecord",
  (input: unknown): input is MapRecordListType =>
    pipe(
      MapRecordList.decode(input),
      E.fold(
        () => false,
        () => true
      )
    ),
  (input, context) =>
    pipe(
      t.UnknownArray.validate(input, context),
      E.chain((records) =>
        A.sequence(E.either)(
          records.map((record) =>
            MapRecordFromDatabaseRecord.validate(record, context)
          )
        )
      ),
      E.chain((mapList) => t.success(mapList))
    ),
  (value) => value
);

const decodeMapList = flow(
  MapRecordListFromDatabaseRecord.decode,
  E.mapLeft(formatDecodeError),
  TE.fromEither
);

export const loadPaginatedMaps = (params: {
  first: number;
}): RTE.ReaderTaskEither<{ db: Database }, Error, MapRecordListType> => ({
  db,
}) =>
  pipe(
    TE.tryCatch(
      () =>
        db.all<unknown>(
          /* SQL */ `
          SELECT
            "id",
            "title",
            "grid",
            "objects",
            "created_at"
          FROM "maps"
          ORDER BY
            "created_at" DESC,
            "id" DESC
          LIMIT ?
          ;
      `,
          params.first
        ),
      E.toError
    ),
    TE.chain(decodeMapList)
  );

export const loadMorePaginatedMaps = (params: {
  lastCreatedAt: number;
  lastId: string;
  first: number;
}): RTE.ReaderTaskEither<{ db: Database }, Error, MapRecordListType> => ({
  db,
}) =>
  pipe(
    TE.tryCatch(
      () =>
        db.all<unknown>(
          /* SQL */ `
          SELECT
            "id",
            "title",
            "grid",
            "objects",
            "created_at"
          FROM "maps"
          WHERE
            "created_at" <= ?
            AND "id" < ?
          ORDER BY
            "created_at" DESC,
            "id" DESC
          LIMIT ?
          ;
      `,
          params.lastCreatedAt,
          params.lastId,
          params.first
        ),
      E.toError
    ),
    TE.chain(decodeMapList)
  );
