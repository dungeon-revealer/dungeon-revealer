import { pipe } from "fp-ts/lib/function";
import * as RT from "fp-ts/lib/ReaderTask";
import { randomUUID } from "crypto";
import * as path from "path";
import * as fs from "fs-extra";
import type { MapEntity, MapGridEntity, Maps } from "./maps";
import * as auth from "./auth";
import type { Settings } from "./settings";
import { invalidateResourcesRT } from "./live-query-store";

type MapsDependency = {
  maps: Maps;
};

type SettingsDependency = {
  settings: Settings;
};

export const updateManyMapToken = (params: {
  mapId: string;
  tokenIds: Set<string>;
  props: {
    color: string | undefined;
    isVisibleForPlayers: boolean | undefined;
    isMovableByPlayers: boolean | undefined;
    tokenImageId: string | null | undefined;
    rotation: number | undefined;
  };
}) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() => RT.ask<MapsDependency>()),
    RT.chainW(
      (deps) => () => () =>
        deps.maps.updateManyTokens(params.mapId, params.tokenIds, {
          color: params.props.color,
          isVisibleForPlayers: params.props.isVisibleForPlayers,
          isMovableByPlayers: params.props.isMovableByPlayers,
          tokenImageId: params.props.tokenImageId,
          rotation: params.props.rotation,
        })
    ),
    RT.chainW(() => invalidateResourcesRT([`Map:${params.mapId}`])),
    RT.map(() => null)
  );

export const removeManyMapToken = (params: {
  mapId: string;
  tokenIds: Set<string>;
}) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() => RT.ask<MapsDependency>()),
    RT.chainW(
      (deps) => () => () =>
        deps.maps.removeTokensById(params.mapId, params.tokenIds)
    ),
    RT.chainW(() => invalidateResourcesRT([`Map:${params.mapId}`])),
    RT.map(() => null)
  );

export const addManyMapToken = (params: {
  mapId: string;
  tokenProps: Array<{
    x?: number | null;
    y?: number | null;
    radius?: null | number;
    rotation?: null | number;
    color?: string | null;
    label?: string | null;
    isLocked?: boolean | null;
    isVisibleForPlayers?: boolean | null;
    isMovableByPlayers?: boolean | null;
    tokenImageId?: null | string;
  }>;
}) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() => RT.ask<MapsDependency>()),
    RT.chainW(
      (deps) => () => () => deps.maps.addTokens(params.mapId, params.tokenProps)
    ),
    RT.chainW(() => invalidateResourcesRT([`Map:${params.mapId}`])),
    RT.map(() => null)
  );

export const getPaginatedMaps = (params: {
  /* amount of items to fetch */
  first: number;
  /* cursor which can be used to fetch more. */
  cursor: null | {
    /* createdAt date of the item after which items should be fetched */
    lastCreatedAt: number;
    /* id of the item after which items should be fetched */
    lastId: string;
  };
  /**
   * filter maps via title
   * TODO: should this be part of the cursor?
   * */
  titleNeedle: string | null;
}) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() => RT.ask<MapsDependency>()),
    RT.chainW((deps) => () => async () => {
      let allMaps = deps.maps.getAll();
      if (params.titleNeedle) {
        const titleNeedle = params.titleNeedle.toLowerCase();
        allMaps = allMaps.filter((map) =>
          map.title.toLowerCase().includes(titleNeedle)
        );
      }
      let index = -1;

      if (params.cursor) {
        const lastId = params.cursor.lastId;
        index = allMaps.findIndex((map) => map.id === lastId);
      }

      index = index + 1;

      const batch = allMaps.slice(index, index + params.first);
      return batch;
    })
  );

type MapImageUploadRegisterRecord = {
  id: string;
  fileExtension: string;
};

export type MapImageUploadRegister = Map<string, MapImageUploadRegisterRecord>;

type MapImageUploadRegisterDependency = {
  mapImageUploadRegister: MapImageUploadRegister;
  publicUrl: string;
  fileStoragePath: string;
};

export const createMapImageUploadRegister = (): MapImageUploadRegister =>
  new Map();

export type MapImageUploadRequestResult = {
  id: string;
  uploadUrl: string;
};

export const createMapImageUploadUrl = (params: {
  sha256: string;
  extension: string;
}) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() => RT.ask<MapImageUploadRegisterDependency>()),
    RT.chain((deps) => () => async () => {
      let record = deps.mapImageUploadRegister.get(params.sha256);

      const uuid = randomUUID();

      const key = `${params.sha256}_${uuid}`;

      if (!record) {
        record = {
          id: key,
          fileExtension: params.extension,
        };
      }

      deps.mapImageUploadRegister.set(key, record);

      return {
        uploadUrl: `${deps.publicUrl}/files/map-image/${key}.${params.extension}`,
        id: key,
      };
    })
  );

export type MapCreateError = {
  type: "error";
  reason: string;
};

export type MapCreateSuccess = {
  type: "success";
  createdMap: MapEntity;
};

export type MapCreateResult = MapCreateError | MapCreateSuccess;

const buildMapImagePath = (fileStoragePath: string) =>
  path.join(fileStoragePath, "map-image");

export const mapCreate = (params: {
  mapImageUploadId: string;
  title: string;
}) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() =>
      RT.ask<MapImageUploadRegisterDependency & MapsDependency>()
    ),
    RT.chain((deps) => () => async (): Promise<MapCreateResult> => {
      const record = deps.mapImageUploadRegister.get(params.mapImageUploadId);
      if (record === undefined) {
        return {
          type: "error",
          reason: "Image upload does not exists.",
        };
      }

      const filePath = path.join(
        buildMapImagePath(deps.fileStoragePath),
        `${record.id}.${record.fileExtension}`
      );

      if (false === (await fs.pathExists(filePath))) {
        return {
          type: "error",
          reason: "Image has not been uploaded yet.",
        };
      }

      deps.mapImageUploadRegister.delete(params.mapImageUploadId);

      const createdMap = await deps.maps.createMap({
        title: params.title,
        fileExtension: record.fileExtension,
        filePath: filePath,
      });

      return {
        type: "success",
        createdMap,
      };
    })
  );

export const mapDelete = (params: { mapId: string }) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() => RT.ask<MapsDependency>()),
    RT.chain((deps) => () => () => deps.maps.deleteMap(params.mapId))
  );

export type MapUpdateTitleResult = {
  updatedMap: MapEntity;
};

export const mapUpdateTitle = (params: { mapId: string; newTitle: string }) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() => RT.ask<MapsDependency>()),
    RT.chain(
      (deps) => () => () =>
        deps.maps.updateMapSettings(params.mapId, { title: params.newTitle })
    ),
    RT.chainW((map) =>
      pipe(
        invalidateResourcesRT([`Map:${map.id}`]),
        RT.map(() => map)
      )
    ),
    RT.map((updatedMap): MapUpdateTitleResult => ({ updatedMap }))
  );

export type MapUpdateGridResult = {
  updatedMap: MapEntity;
};

export const mapUpdateGrid = (params: {
  mapId: string;
  grid: MapGridEntity | null;
  showGrid: boolean;
  showGridToPlayers: boolean;
}) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() => RT.ask<MapsDependency>()),
    RT.chain(
      (deps) => () => () =>
        deps.maps.updateMapSettings(params.mapId, {
          grid: params.grid ? params.grid : null,
          showGrid: params.showGrid,
          showGridToPlayers: params.showGridToPlayers,
        })
    ),
    RT.chainW((map) =>
      pipe(
        invalidateResourcesRT([`Map:${map.id}`]),
        RT.map(() => map)
      )
    ),
    RT.map((updatedMap): MapUpdateTitleResult => ({ updatedMap }))
  );

export const getActiveMap = () =>
  pipe(
    auth.requireAuth(),
    RT.chainW(() => RT.ask<SettingsDependency & MapsDependency>()),
    RT.chainW((deps) => () => async () => {
      const currentMapId = deps.settings.get("currentMapId");
      if (currentMapId) {
        return deps.maps.get(currentMapId);
      }
      return null;
    })
  );

export const getMapById = (params: { mapId: string }) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() => RT.ask<MapsDependency>()),
    RT.chain((deps) => () => async () => deps.maps.get(params.mapId))
  );

export const setActiveMap = (params: { activeMapId: string }) =>
  pipe(
    auth.requireAdmin(),
    RT.chainW(() => RT.ask<SettingsDependency>()),
    RT.chain(
      (deps) => () => async () =>
        deps.settings.set("currentMapId", params.activeMapId)
    ),
    RT.map(() => true)
  );

export type MapPing = {
  id: string;
  x: number;
  y: number;
};

export type MapPosition = {
  x: number;
  y: number;
};

export type MapMove = {
  id: string;
  scale: number;
  position: MapPosition;
};

export type MapPubSubConfig = {
  mapPing: [id: string, mapPing: MapPing];
  mapMove: [id: string, mapMove: MapMove];
};
