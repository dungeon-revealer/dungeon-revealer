import * as R from "fp-ts/lib/Reader";
import * as O from "fp-ts/lib/Option";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as RT from "fp-ts/lib/ReaderTask";
import * as E from "fp-ts/lib/Either";
import * as db from "./maps-db";
import * as permissions from "./permissions";
import { pipe, flow } from "fp-ts/lib/function";
import { Lens } from "monocle-ts";
import { SocketSessionRecord } from "./socket-session-store";
import { ResourceTaskProcessor } from "./util";
import { v4 as uuid } from "uuid";

export type { MapRecordType, MapGridType, MapTokenType } from "./maps-db";

export const loadMapById = (params: Parameters<typeof db.loadMapById>[0]) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
    RTE.chainW(() => db.loadMapById(params))
  );

export const createActiveMapStore = (initialValue: string | null) => {
  let _activeMapId: O.Option<string> = O.fromNullable(initialValue);

  return {
    set: (activeMapId: string | null) => {
      _activeMapId = O.fromNullable(activeMapId);
    },
    get: () => _activeMapId,
  };
};

export type ActiveMapStore = ReturnType<typeof createActiveMapStore>;

const _setActiveMapId = (params: {
  mapId: string;
}): R.Reader<
  {
    activeMapStore: ActiveMapStore;
  },
  void
> => (deps) => deps.activeMapStore.set(params.mapId);

export const setActiveMapId = (params: { mapId: string }) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
    RTE.chainW(() => db.loadMapById({ id: params.mapId })),
    RTE.chainW((map) => RTE.rightReader(_setActiveMapId({ mapId: map.id })))
  );

const _getActiveMapId = (): R.Reader<
  { activeMapStore: ActiveMapStore },
  O.Option<string>
> => (deps) => deps.activeMapStore.get();

const _buildMapRepresentation = (
  map: O.Option<db.MapRecordType>
): R.Reader<{ session: SocketSessionRecord }, O.Option<db.MapRecordType>> => (
  deps
) =>
  O.isSome(map)
    ? deps.session.role === "admin"
      ? map
      : O.some({
          ...map.value,
          grid:
            map.value.grid?.isVisibleForPlayers ?? false
              ? map.value.grid
              : null,
          objects: pipe(
            map.value.objects,
            Object.entries,
            (records) =>
              records.filter(
                ([, object]) => object.isVisibleForPlayers === false
              ),
            Object.fromEntries
          ),
        })
    : map;

export const getActiveMap = () =>
  pipe(
    _getActiveMapId(),
    RTE.rightReader,
    RTE.chainW((id) =>
      O.isSome(id)
        ? pipe(
            db.loadMapById({ id: id.value }),
            RTE.map((map) => O.some(map))
          )
        : RTE.right(O.none)
    ),
    RTE.chainW(flow(_buildMapRepresentation, RTE.rightReader))
  );

// This is some wrapper that ensures only on task at a time is executed concurrently.
const applyInSequence = (resourceIdentifier: string) => (
  resourceId: string
) => <TContext, TError, TResult>(
  task: RTE.ReaderTaskEither<TContext, TError, TResult>
): RTE.ReaderTaskEither<
  TContext & { resourceTaskProcessor: ResourceTaskProcessor },
  TError | Error,
  TResult
> =>
  pipe(
    RTE.ask<{ resourceTaskProcessor: ResourceTaskProcessor } & TContext>(),
    RTE.chainW((deps) =>
      pipe(
        TE.tryCatch(
          () =>
            deps.resourceTaskProcessor(
              `${resourceIdentifier}.${resourceId}`,
              () =>
                // run the task with all its dependencies
                RT.run(
                  pipe(
                    task,
                    RTE.fold(
                      (err) => {
                        throw err;
                      },
                      (result) => RT.of(result)
                    )
                  ),
                  deps
                )
            ),
          E.toError
        ),
        RTE.fromTaskEither
      )
    )
  );

const applyMapUpdate = (
  id: string,
  update: (record: db.MapRecordType) => db.MapRecordType
) =>
  pipe(
    db.loadMapById({ id }),
    RTE.map(update),
    RTE.chainW((map) => db.persistMap({ map })),
    applyInSequence("Map")(id)
  );

const MapRecordLens = Lens.fromPath<db.MapRecordType>();

const mapTitle = MapRecordLens(["title"]);

const mapObjects = MapRecordLens(["objects"]);

export const changeMapTitle = (params: { mapId: string; newTitle: string }) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
    RTE.chainW(() =>
      applyMapUpdate(params.mapId, mapTitle.set(params.newTitle))
    )
  );

export const addMapToken = (params: {
  mapId: string;
  token: { label: string; x: number; y: number; color: string; radius: number };
}) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
    RTE.chainW(() => {
      const tokenId = uuid();
      return applyMapUpdate(
        params.mapId,
        mapObjects.modify((objects) => ({
          ...objects,
          [tokenId]: {
            id: tokenId,
            type: "MapToken",
            label: params.token.label,
            x: params.token.x,
            y: params.token.y,
            color: params.token.color,
            radius: params.token.radius,
            isLockedForDungeonMaster: false,
            isLockedForPlayers: true,
            isVisibleForPlayers: false,
            reference: null,
          },
        }))
      );
    })
  );

export const deleteMapToken = (params: { mapId: string; tokenId: string }) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
    RTE.chainW(() =>
      applyMapUpdate(
        params.mapId,
        mapObjects.modify(
          flow(
            Object.entries,
            (records) => records.filter(([id]) => id === params.tokenId),
            Object.fromEntries
          )
        )
      )
    )
  );

export const updateMapTokenPosition = (params: {
  mapId: string;
  tokenId: string;
  position: { x: number; y: number };
}) =>
  pipe(
    permissions.askSession(),
    RTE.rightReader,
    RTE.chainW(({ session }) =>
      applyMapUpdate(
        params.mapId,
        mapObjects.modify((records) => {
          const token = records[params.tokenId];
          if (
            // prettier-ignore
            !token ||
            session.role === "unauthenticated" ||
            (session.role === "admin" && token.isLockedForDungeonMaster === true) ||
            (session.role === "user" && (token.isLockedForPlayers === true || token.isVisibleForPlayers === true))
          ) {
            return records;
          }

          return {
            ...records,
            [params.tokenId]: {
              ...token,
              ...params.position,
            },
          };
        })
      )
    )
  );

export const loadPaginatedMaps = (
  params: Parameters<typeof db.loadPaginatedMaps>[0]
) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
    RTE.chainW(() => db.loadPaginatedMaps(params))
  );

export const loadMorePaginatedMaps = (
  params: Parameters<typeof db.loadMorePaginatedMaps>[0]
) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
    RTE.chainW(() => db.loadMorePaginatedMaps(params))
  );
