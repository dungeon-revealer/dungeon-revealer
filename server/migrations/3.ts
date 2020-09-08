import * as sqlite from "sqlite";
import * as fs from "fs-extra";
import * as path from "path";
import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import { pipe } from "fp-ts/lib/pipeable";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { v4 as uuid } from "uuid";

import { sequenceT } from "fp-ts/lib/Apply";

// Utility for decoding a type with fallback
const withFallback = <O>(input: t.Type<O>, fallback: () => O) =>
  new t.Type(
    `${input.name}WithFallback`,
    input.is,
    (value, context) =>
      pipe(input.validate(value, context), E.getOrElse(fallback), t.success),
    input.encode
  );

// START LEGACY TYPES FOR JSON

const LegacyGrid = t.type(
  {
    x: t.number,
    y: t.number,
    sideLength: t.number,
  },
  "LegacyGrid"
);

const LegacyTokenReference = t.union(
  [
    t.null,
    t.type({
      type: t.literal("note"),
      id: t.string,
    }),
  ],
  "LegacyTokenReference"
);

const LegacyToken = t.type(
  {
    id: withFallback(t.string, () => uuid()),
    x: withFallback(t.number, () => 0),
    y: withFallback(t.number, () => 0),
    radius: withFallback(t.number, () => 15),
    color: withFallback(t.string, () => "yellow"),
    label: withFallback(t.string, () => ""),
    isVisibleForPlayers: withFallback(t.boolean, () => false),
    type: withFallback(t.string, () => "entity"),
    title: withFallback(t.string, () => "Untitled"),
    isLocked: withFallback(t.boolean, () => true),
    isMovableByPlayers: withFallback(t.boolean, () => true),
    reference: withFallback(LegacyTokenReference, () => null),
  },
  "LegacyToken"
);

// END LEGACY TYPES FOR JSON

const maybe = <A>(type: t.Type<A>) =>
  t.union([t.null, type], `Maybe${type.name}`);

// START NEW DATABASE MODEL TYPES

const MapGridModel = t.type(
  {
    color: t.string,
    sideLength: t.number,
    x: t.number,
    y: t.number,
    isVisibleForPlayers: t.boolean,
    isVisibleForDungeonMaster: t.boolean,
  },
  "MapGridModel"
);

const NoteReference = t.type(
  {
    type: t.literal("NoteReference"),
    id: t.string,
  },
  "NoteReference"
);

const MapToken = t.type(
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
    reference: t.union([NoteReference, t.null], "MaybeTokenReferenceModel"),
  },
  "MapToken"
);

export const MapObjects = t.record(t.string, MapToken, "MapObjects");

const MapModel = t.type(
  {
    id: t.string,
    type: t.literal("Map"),
    title: t.string,
    grid: t.union([MapGridModel, t.null], "MaybeMapGridModel"),
    objects: MapObjects,
    mapAssetFilePath: t.string,
    mapFogProgressAssetFilePath: t.union([t.string, t.null]),
    mapFogLiveAssetFilePath: t.union([t.string, t.null]),
  },
  "MapRecord"
);

// END NEW DATABASE MODEL TYPES

// Type for parsing an existing JSON map into the new database model form
const MapRecordFromSettings = new t.Type(
  "MapRecordFromSettings",
  (input: unknown): input is t.TypeOf<typeof MapModel> =>
    pipe(
      MapModel.decode(input),
      E.fold(
        () => false,
        () => true
      )
    ),
  (input: unknown, context) =>
    pipe(
      t.UnknownRecord.validate(input, context),
      E.chain((record) =>
        sequenceT(E.either)(
          withFallback(t.string, () => uuid()).decode(record["id"]),
          withFallback(t.string, () => "<Untitled Map>").decode(
            record["title"]
          ),
          pipe(t.string.decode(record["mapPath"])),
          withFallback(maybe(t.string), () => null).decode(
            record["fogProgressPath"]
          ),
          withFallback(maybe(t.string), () => null).decode(
            record["fogLivePath"]
          ),
          withFallback(t.boolean, () => false).decode(record["showGrid"]),
          withFallback(t.boolean, () => false).decode(
            record["showGridToPlayers"]
          ),
          withFallback(t.string, () => "rgba(0, 0, 0, 0.5").decode(
            record["gridColor"]
          ),
          withFallback(maybe(LegacyGrid), () => null).decode(record["grid"]),
          withFallback(t.array(LegacyToken), () => []).decode(record["tokens"])
        )
      ),
      E.chain(
        ([
          id,
          title,
          mapAssetFilePath,
          mapFogProgressAssetFilePath,
          mapFogLiveAssetFilePath,
          showGrid,
          showGridToPlayers,
          gridColor,
          grid,
          tokens,
        ]) =>
          t.success(
            MapModel.encode({
              id,
              type: "Map",
              title,
              mapAssetFilePath,
              mapFogProgressAssetFilePath,
              mapFogLiveAssetFilePath,
              grid: grid
                ? {
                    color: gridColor,
                    sideLength: grid.sideLength,
                    x: grid.x,
                    y: grid.y,
                    isVisibleForPlayers: showGridToPlayers,
                    isVisibleForDungeonMaster: showGrid,
                  }
                : null,
              objects: Object.fromEntries(
                tokens.map(
                  (token) =>
                    [
                      token.id,
                      {
                        id: token.id,
                        type: "MapToken",
                        x: token.x,
                        y: token.y,
                        radius: token.radius,
                        label: token.label,
                        isLockedForDungeonMaster: token.isLocked,
                        isLockedForPlayers: token.isMovableByPlayers,
                        isVisibleForPlayers: token.isVisibleForPlayers,
                        reference: token.reference
                          ? {
                              type: "NoteReference" as const,
                              id: token.reference.id,
                            }
                          : null,
                      },
                    ] as const
                )
              ),
            })
          )
      )
    ),
  (value) => value
);

export const migrate = async ({
  db,
  dataPath,
}: {
  db: sqlite.Database;
  dataPath: string;
}) => {
  return;
  await db.exec(/* SQL */ `
    BEGIN;
    -- PRAGMA "user_version" = 4;
    DROP TABLE IF EXISTS "maps";
    CREATE TABLE "maps" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "grid" TEXT,
      "objects" TEXT NOT NULL,
      "map_asset_file_path" TEXT,
      "map_fog_live_asset_file_path" TEXT,
      "map_fog_progress_asset_file_path" TEXT,
      "created_at" INT NOT NULL
    );
    DROP TABLE IF EXISTS "json_key_value";
    CREATE TABLE "json_key_value" (
      "key" TEXT PRIMARY KEY NOT NULL,
      "value" TEXT NOT NULL
    );
    COMMIT;
  `);

  const legacyNoteDirectory = path.join(dataPath, "maps");

  if (fs.pathExistsSync(legacyNoteDirectory) === false) {
    return;
  }

  const mapPaths = fs
    .readdirSync(legacyNoteDirectory)
    .map((content) => path.join(legacyNoteDirectory, content))
    .filter((mapPath) => fs.lstatSync(mapPath).isDirectory());

  for (const mapPath of mapPaths) {
    const settingsPath = path.join(mapPath, "settings.json");

    let settings: unknown;

    try {
      settings = fs.readJSONSync(settingsPath);
    } catch (err) {
      console.error(
        `Failed importing map '${mapPath}'. Missing 'settings.json' file.`
      );
      continue;
    }

    const newMapsTmpPath = path.join(dataPath, "map_assets");

    fs.mkdirpSync(path.join(dataPath, "map_assets"));

    await pipe(
      MapRecordFromSettings.decode(settings),
      TE.fromEither,
      TE.fold(
        (errors) => {
          const lines = PathReporter.report(E.left(errors));
          console.log(
            `Failed importing map '${mapPath}'. Could not parse 'settings.json file.'\n` +
              "Reason: Invalid task schema. \n" +
              lines.map((line) => `- ${line}`).join("\n")
          );
          return TE.right(undefined);
        },
        (map) =>
          pipe(
            sequenceT(TE.taskEither)(
              TE.tryCatch(async () => {
                const fileExtension = path.extname(map.mapAssetFilePath);
                const mapAssetFilePath = `${map.id}.map.${fileExtension}`;

                await fs.copyFile(
                  path.join(mapPath, map.mapAssetFilePath),
                  path.join(newMapsTmpPath, mapAssetFilePath)
                );
                return mapAssetFilePath;
              }, E.toError),
              TE.tryCatch(async () => {
                if (map.mapFogProgressAssetFilePath === null) {
                  return null;
                }

                const fileExtension = path.extname(
                  map.mapFogProgressAssetFilePath
                );
                const mapFogProgressAssetFilePath = `${map.id}.fog-progress.${fileExtension}`;
                await fs.copyFile(
                  path.join(mapPath, map.mapFogProgressAssetFilePath),
                  path.join(newMapsTmpPath, mapFogProgressAssetFilePath)
                );
                return mapFogProgressAssetFilePath;
              }, E.toError),
              TE.tryCatch(async () => {
                if (map.mapFogLiveAssetFilePath === null) {
                  return null;
                }

                const fileExtension = path.extname(map.mapFogLiveAssetFilePath);
                const mapFogLiveAssetFilePath = `${map.id}.fog-live.${fileExtension}`;
                await fs.copyFile(
                  path.join(mapPath, map.mapFogLiveAssetFilePath),
                  path.join(newMapsTmpPath, mapFogLiveAssetFilePath)
                );
                return mapFogLiveAssetFilePath;
              }, E.toError)
            ),
            TE.chain(
              ([
                mapAssetFilePath,
                mapFogProgressAssetFilePath,
                mapFogLiveAssetFilePath,
              ]) =>
                TE.tryCatch(
                  () =>
                    db.run(
                      /* SQL */ `
                    INSERT INTO "maps" (
                      "id",
                      "title",
                      "grid",
                      "objects",
                      "map_asset_file_path",
                      "map_fog_progress_asset_file_path",
                      "map_fog_live_asset_file_path",
                      "created_at"
                    ) VALUES (
                      ?,
                      ?,
                      ?,
                      ?,
                      ?,
                      ?,
                      ?,
                      ?
                    )
                  `,
                      map.id,
                      map.title,
                      JSON.stringify(map.grid),
                      JSON.stringify(map.objects),
                      mapAssetFilePath,
                      mapFogProgressAssetFilePath,
                      mapFogLiveAssetFilePath,
                      new Date().getTime()
                    ),
                  (err) => {
                    console.error(err);
                    return E.toError(err);
                  }
                )
            ),
            TE.map(() => undefined),
            TE.mapLeft((err) => {
              console.error(
                `Failed importing map '${mapPath}'. Reason: ` + err
              );
            })
          )
      )
    )();

    await fs.move(legacyNoteDirectory, path.join(dataPath, ".old_maps"));
    await fs.unlink(legacyNoteDirectory).catch(() => undefined);
  }
};
