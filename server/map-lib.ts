import { pipe } from "fp-ts/lib/function";
import * as RT from "fp-ts/lib/ReaderTask";
import type { Server as IOServer } from "socket.io";
import type { Maps } from "./maps";
import * as auth from "./auth";

type MapsDependency = {
  maps: Maps;
};

type SocketDependency = {
  socketServer: IOServer;
};

const emitLegacyTokenUpdate = (params: {
  mapId: string;
  tokenIds: Set<string>;
}) =>
  pipe(
    RT.ask<MapsDependency>(),
    RT.chain(
      (deps) => () => () => Promise.resolve(deps.maps.get(params.mapId))
    ),
    RT.map((map) =>
      map?.tokens.filter((token) => params.tokenIds.has(token.id))
    ),
    RT.chainW((tokens) =>
      tokens
        ? pipe(
            RT.ask<SocketDependency>(),
            RT.chain((deps) => () => async () => {
              deps.socketServer.emit(`token:mapId:${params.mapId}`, {
                type: "update",
                data: { tokens },
              });
            })
          )
        : RT.of(undefined)
    )
  );

const emitLegacyTokenRemove = (params: {
  mapId: string;
  tokenIds: Set<string>;
}) =>
  pipe(
    RT.ask<SocketDependency>(),
    RT.chain((deps) => () => async () => {
      deps.socketServer.emit(`token:mapId:${params.mapId}`, {
        type: "remove",
        data: { tokenIds: Array.from(params.tokenIds) },
      });
    })
  );

const emitLegacyTokenAdd = (params: { mapId: string; tokens: Array<any> }) =>
  pipe(
    RT.ask<SocketDependency>(),
    RT.chain((deps) => () => async () => {
      deps.socketServer.emit(`token:mapId:${params.mapId}`, {
        type: "add",
        data: { tokens: Array.from(params.tokens) },
      });
    })
  );

export const updateManyMapToken = (params: {
  mapId: string;
  tokenIds: Set<string>;
  props: {
    color: string | undefined;
    isVisibleForPlayers: boolean | undefined;
    isMovableByPlayers: boolean | undefined;
    tokenImageId: string | null | undefined;
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
        })
    ),
    RT.chainW(() =>
      emitLegacyTokenUpdate({
        mapId: params.mapId,
        tokenIds: params.tokenIds,
      })
    ),
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
    RT.chainW((tokenIds) =>
      emitLegacyTokenRemove({
        mapId: params.mapId,
        tokenIds,
      })
    ),
    RT.map(() => null)
  );

export const addManyMapToken = (params: {
  mapId: string;
  tokenProps: Array<{
    x?: number | null;
    y?: number | null;
    radius?: null | number;
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
    RT.chainW(({ tokens }) =>
      emitLegacyTokenAdd({
        mapId: params.mapId,
        tokens,
      })
    ),
    RT.map(() => null)
  );
