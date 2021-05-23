import { pipe } from "fp-ts/lib/function";
import * as RT from "fp-ts/lib/ReaderTask";
import type { Server as IOServer } from "socket.io";

import type { Maps } from "./maps";

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
    RT.ask<MapsDependency>(),
    RT.chain(
      (deps) => () => () =>
        deps.maps.updateManyTokens(params.mapId, params.tokenIds, {
          color: params.props.color,
          isVisibleForPlayers: params.props.isVisibleForPlayers,
          isMovableByPlayers: params.props.isMovableByPlayers,
          tokenImageId: params.props.tokenImageId,
        })
    ),
    RT.chain(() =>
      emitLegacyTokenUpdate({
        mapId: params.mapId,
        tokenIds: params.tokenIds,
      })
    ),
    RT.map(() => null)
  );
