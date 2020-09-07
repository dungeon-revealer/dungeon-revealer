import * as R from "fp-ts/lib/Reader";
import * as O from "fp-ts/lib/Option";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RE from "fp-ts/lib/ReaderEither";
import * as db from "./maps-db";
import * as permissions from "./permissions";
import { pipe } from "fp-ts/lib/pipeable";
import { SocketSessionRecord } from "./socket-session-store";

export type { MapRecordType, MapGridType, MapTokenType } from "./maps-db";

export const loadMapById = (params: Parameters<typeof db.loadMapById>[0]) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
    RTE.chainW(() => db.loadMapById(params))
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

export const createActiveMapStore = (params: {
  /* Function that is invoked after a mutation for persisting the changes */
  persistRecord: (record: db.MapRecordType) => void;
  onChange: (record: db.MapRecordType | null) => void;
}) => {
  let _activeMap: null | db.MapRecordType = null;

  return {
    set: (activeMap: db.MapRecordType | null) => {
      _activeMap = activeMap;
    },
    mutate: (mutateParams: {
      mutator: (map: db.MapRecordType | null) => void;
    }) => {
      mutateParams.mutator(_activeMap);
      params.onChange(_activeMap);
    },
    get: () => O.fromNullable(_activeMap),
  };
};

export type ActiveMapStore = ReturnType<typeof createActiveMapStore>;

const _setActiveMap = (params: {
  map: db.MapRecordType;
}): R.Reader<
  {
    activeMapStore: ActiveMapStore;
  },
  void
> => (deps) => deps.activeMapStore.set(params.map);

export const setActiveMap = (params: { mapId: string }) =>
  pipe(
    permissions.checkAdmin(null),
    RTE.fromReaderEither,
    RTE.chainW(() => db.loadMapById({ id: params.mapId })),
    RTE.chainW((map) => RTE.rightReader(_setActiveMap({ map })))
  );

export const getActiveMap = (): R.Reader<
  { activeMapStore: ActiveMapStore; session: SocketSessionRecord },
  O.Option<db.MapRecordType>
> => (deps) =>
  pipe(
    deps.activeMapStore.get(),
    // consumers that are not admins should not be able to see hidden items :)
    O.map((map) =>
      deps.session.role === "admin"
        ? map
        : {
            ...map,
            grid: map.grid?.isVisibleForPlayers ?? false ? map.grid : null,
            objects: map.objects.filter(
              (object) => object.isVisibleForPlayers === false
            ),
          }
    )
  );

const _addObjects = (params: {
  objects: db.MapObjectsType;
}): R.Reader<{ activeMapStore: ActiveMapStore }, void> => (deps) =>
  deps.activeMapStore.mutate({
    mutator: (map) => {
      map?.objects.push(...params.objects);
    },
  });

export const addObjectsToActiveMap = (
  params: Parameters<typeof _addObjects>[0]
) =>
  pipe(
    permissions.checkAdmin(null),
    RE.chainW(() => RE.rightReader(_addObjects(params)))
  );

// export const addObjectToActiveMap = (params: {
//   object: db.MapObjectsType[number];
// }) => addObjectsToActiveMap({ objects: [params.object] });
