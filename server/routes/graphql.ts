import { Router, static as expressStatic } from "express";
import path from "path";
import fs from "fs-extra";
import type { Server as IOServer, Socket as IOSocket } from "socket.io";
import { flow } from "fp-ts/lib/function";
import { schema, GraphQLContextType } from "../graphql";
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
import { createSplashImageState } from "../splash-image-state";
import { createPubSub } from "../pubsub";
import { NotesUpdatesPayload } from "../notes-lib";
import { createTokenImageUploadRegister } from "../token-image-lib";
import * as AsyncIteratorUtil from "../util/async-iterator";
import { isAsyncIterable } from "@n1ru4l/push-pull-async-iterable-iterator";

type MaybePromise<T> = Promise<T> | T;

type Dependencies = {
  roleMiddleware: any;
  socketSessionStore: SocketSessionStore;
  db: Database;
  socketServer: IOServer;
  fileStoragePath: string;
  publicUrl: string;
};

export default ({
  socketServer,
  socketSessionStore,
  db,
  fileStoragePath,
  publicUrl,
}: Dependencies) => {
  const chat = createChat();
  const user = createUser({
    sendUserConnectedMessage: ({ name }) =>
      chat.addOperationalMessage({ content: `**${name}** connected.` }),
    sendUserDisconnectedMessage: ({ name }) =>
      chat.addOperationalMessage({ content: `**${name}** disconnected.` }),
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

  const notesUpdates = createPubSub<NotesUpdatesPayload>();
  const tokenImageUploadRegister = createTokenImageUploadRegister();

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
          return AsyncIteratorUtil.map(apply)(result);
        } else {
          return apply(result);
        }
      };
      return input instanceof Promise ? input.then(handler) : handler(input);
    };

  const execute = flow(
    liveQueryStore.execute,
    applyExecuteMiddleware(graphQLErrorLogger)
  );

  const subscribe = flow(
    originalSubscribe,
    applyExecuteMiddleware(graphQLErrorLogger)
  );

  const socketIOGraphQLServer = registerSocketIOGraphQLServer({
    socketServer,
    isLazy: true,
    getParameter: ({ socket }) => ({
      execute,
      // @ts-ignore
      subscribe,
      graphQLExecutionParameter: {
        schema,
        contextValue: {
          chat,
          user,
          db,
          session: getSession(socket),
          liveQueryStore,
          splashImageState,
          socket,
          notesUpdates,
          fileStoragePath,
          tokenImageUploadRegister,
          publicUrl,
        } as GraphQLContextType,
      },
    }),
  });

  // TODO: this should definetly be moved somewhere else
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
