import { Router, static as expressStatic } from "express";
import path from "path";
import fs from "fs-extra";
import { EventEmitter } from "events";
import type { Server as IOServer, Socket as IOSocket } from "socket.io";
import { createPubSub, map } from "@graphql-yoga/subscription";
import { flow } from "fp-ts/lib/function";
import { schema, GraphQLContextType, PubSubConfig } from "../graphql";
import { createChat } from "../chat";
import { createUser } from "../user";
import type { Database } from "sqlite";
import type {
  SocketSessionStore,
  SocketSessionRecord,
} from "../socket-session-store";
import { ExecutionResult, subscribe as originalSubscribe } from "graphql";
import { registerSocketIOGraphQLServer } from "@n1ru4l/socket-io-graphql-server";
import { InMemoryLiveQueryStore } from "@n1ru4l/in-memory-live-query-store";
import { applyLiveQueryJSONDiffPatchGenerator } from "@n1ru4l/graphql-live-query-patch-jsondiffpatch";
import { isAsyncIterable } from "@n1ru4l/push-pull-async-iterable-iterator";
import { createSplashImageState } from "../splash-image-state";
import { createTokenImageUploadRegister } from "../token-image-lib";
import type { Maps } from "../maps";
import { createMapImageUploadRegister } from "../map-lib";
import type { Settings } from "../settings";

type MaybePromise<T> = Promise<T> | T;

type Dependencies = {
  roleMiddleware: any;
  socketSessionStore: SocketSessionStore;
  db: Database;
  socketServer: IOServer;
  fileStoragePath: string;
  publicUrl: string;
  maps: Maps;
  settings: Settings;
  emitter: EventEmitter;
};

export default ({
  socketServer,
  socketSessionStore,
  db,
  fileStoragePath,
  publicUrl,
  maps,
  settings,
  emitter,
}: Dependencies) => {
  const pubSub = createPubSub<PubSubConfig>();

  const chat = createChat({ pubSub });

  const user = createUser({
    sendUserConnectedMessage: ({ name }) =>
      chat.addOperationalMessage({ content: `**${name}** connected.` }),
    sendUserDisconnectedMessage: ({ name }) =>
      chat.addOperationalMessage({ content: `**${name}** disconnected.` }),
    pubSub,
  });

  const splashImageState = createSplashImageState();

  const router = Router();

  const getSession = (socket: IOSocket): SocketSessionRecord => {
    const session = socketSessionStore.get(socket);
    if (!session) {
      throw new Error("Unexpected error occurred. WebSocket has no session.");
    }
    return session;
  };

  const liveQueryStore = new InMemoryLiveQueryStore();

  emitter.on("invalidate", (ev) => {
    liveQueryStore.invalidate(ev);
  });

  const tokenImageUploadRegister = createTokenImageUploadRegister();
  const mapImageUploadRegister = createMapImageUploadRegister();

  const graphQLErrorLogger = (result: ExecutionResult): ExecutionResult => {
    if (result.errors) {
      for (const error of result.errors) {
        console.error(error.originalError);
      }
    }

    return result;
  };

  const applyExecuteMiddleware =
    <T>(apply: (target: T) => MaybePromise<T>) =>
    (
      input: MaybePromise<AsyncIterableIterator<T> | T>
    ): MaybePromise<AsyncIterableIterator<T> | T> => {
      const handler = (
        result: AsyncIterableIterator<T> | T
      ): AsyncIterableIterator<T> | MaybePromise<T> => {
        if (isAsyncIterable(result)) {
          return map(apply)(result);
        } else {
          return apply(result);
        }
      };
      return input instanceof Promise ? input.then(handler) : handler(input);
    };

  const execute = flow(
    liveQueryStore.execute,
    applyExecuteMiddleware(graphQLErrorLogger),
    applyLiveQueryJSONDiffPatchGenerator
  );

  const subscribe = flow(
    originalSubscribe,
    applyExecuteMiddleware(graphQLErrorLogger)
  );

  const socketIOGraphQLServer = registerSocketIOGraphQLServer({
    socketServer,
    isLazy: true,
    getParameter: ({ socket }) => {
      const contextValue: GraphQLContextType = {
        chat,
        user,
        db,
        session: getSession(socket),
        liveQueryStore,
        splashImageState,
        socket,
        socketServer,
        pubSub,
        fileStoragePath,
        tokenImageUploadRegister,
        publicUrl,
        maps,
        mapImageUploadRegister,
        settings,
      };

      return {
        execute,
        subscribe: subscribe as any,
        graphQLExecutionParameter: {
          schema,
          contextValue: contextValue,
        },
      };
    },
  });

  // TODO: this should definitely be moved somewhere else
  router.put("/files/(*)", (req, res) => {
    const filePath = req.params["0"];
    if (filePath.includes("..")) {
      throw new Error("Invalid request.");
    }
    if (filePath.startsWith("token-image/")) {
      const id = filePath.replace("token-image/", "").split(".")[0];
      if (tokenImageUploadRegister.has(id)) {
        const targetPath = path.join(fileStoragePath, filePath);
        fs.mkdirpSync(path.dirname(targetPath));
        const writeStream = fs.createWriteStream(
          path.join(fileStoragePath, filePath)
        );
        req.pipe(writeStream);
        writeStream.on("close", () => {
          res.send("Done.");
        });
        return;
      }
    } else if (filePath.startsWith("map-image/")) {
      const id = filePath.replace("map-image/", "").split(".")[0];
      if (mapImageUploadRegister.has(id)) {
        const targetPath = path.join(fileStoragePath, filePath);
        fs.mkdirpSync(path.dirname(targetPath));
        const writeStream = fs.createWriteStream(
          path.join(fileStoragePath, filePath)
        );
        req.pipe(writeStream);
        writeStream.on("close", () => {
          res.send("Done.");
        });
        return;
      }
    }
    res.status(401).send("Error");
  });

  router.use(
    "/files",
    expressStatic(fileStoragePath, {
      maxAge: "1y",
    })
  );

  return { router, socketIOGraphQLServer };
};
