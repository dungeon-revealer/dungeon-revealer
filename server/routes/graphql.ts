import { Router } from "express";
import { graphql, subscribe as graphqlSubscribe, parse } from "graphql";
import * as ia from "iterall";
import { schema, GraphQLContextType } from "../graphql";
import { createChat } from "../chat";
import { createUser } from "../user";
import type { Database } from "sqlite";

type Dependencies = {
  roleMiddleware: any;
  registerSocketCommand: (
    handler: (socket: SocketIO.Socket, role: "DM" | "PC") => void
  ) => void;
  db: Database;
};

export default ({
  roleMiddleware,
  registerSocketCommand,
  db,
}: Dependencies) => {
  const chat = createChat();
  const user = createUser({
    sendUserConnectedMessage: ({ name }) =>
      chat.addOperationalMessage({ content: `**${name}** connected.` }),
    sendUserDisconnectedMessage: ({ name }) =>
      chat.addOperationalMessage({ content: `**${name}** disconnected.` }),
  });

  const router = Router();

  registerSocketCommand((socket, role) => {
    const subscriptions = new Map<string, () => void>();

    // by default we use the socket.id
    // however in case the user logs in with an existing id we replace the session id attached to this socket
    let sessionId = socket.id;

    const createContext = (): GraphQLContextType => ({
      chat,
      user,
      getSessionId: () => sessionId,
      setSessionId: (id: string) => {
        sessionId = id;
      },
      db,
      viewerRole: role === "DM" ? "admin" : "user",
    });

    socket.on("graphql/execute", (message) => {
      // TODO: proper validation
      const id = message.id;
      const source = message.operation || message.body.query;
      const variables = message.variables;
      const operationName = message.operationName;

      graphql({
        schema,
        contextValue: createContext(),
        rootValue: {},
        operationName,
        source,
        variableValues: variables,
      }).then((result) => {
        result.errors?.forEach((error) => {
          console.error(error.originalError);
        });
        socket.emit("graphql/result", { id, ...result });
      });
    });

    socket.on("graphql/subscribe", (message) => {
      // TODO: proper validation
      const id = message.id;
      const document = message.operation;
      const variables = message.variables;
      const operationName = message.operationName;

      graphqlSubscribe({
        schema,
        contextValue: createContext(),
        rootValue: {},
        operationName,
        document: parse(document),
        variableValues: variables,
      }).then((result) => {
        if (ia.isAsyncIterable(result)) {
          subscriptions.set(id, () => result.return?.(null));
          const run = async () => {
            for await (const subscriptionResult of result) {
              socket.emit("graphql/update", { id, ...subscriptionResult });
            }
          };
          run();
        } else {
          console.log("Failed setting up GraphQL subscription.");
          console.error(result);
        }
      });
    });

    socket.on("graphql/unsubscribe", (message) => {
      // TODO: proper validation
      const id = message.id;
      const subscription = subscriptions.get(id);
      subscription?.();
      subscriptions.delete(id);
    });

    socket.once("disconnect", () => {
      // Unsubscribe all pending GraphQL Subscriptions
      subscriptions.forEach((unsubscribe) => unsubscribe());

      // Automatically Log out
      user.userDisconnects(sessionId);
    });
  });

  return { router };
};
