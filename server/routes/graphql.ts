import { Router } from "express";
import { graphql, subscribe as graphqlSubscribe, parse } from "graphql";
import * as ia from "iterall";
import { schema } from "../graphql";
import { handleUnexpectedError } from "../util";
import { createChat } from "../chat";

type Dependencies = {
  roleMiddleware: any;
  registerSocketCommand: (handler: (socket: SocketIO.Socket) => void) => void;
};

export default ({ roleMiddleware, registerSocketCommand }: Dependencies) => {
  const chat = createChat();

  const router = Router();

  router.post("/graphql", (req, res) => {
    // TODO: proper validation
    const source = req.body.operation || req.body.query;
    const variables = req.body.variables;
    const operationName = req.body.operationName;

    graphql({
      schema,
      contextValue: { chat },
      rootValue: {},
      operationName,
      source,
      variableValues: variables,
    })
      .then((result) => {
        res.json(result);
      })
      .catch(handleUnexpectedError(res));
  });

  registerSocketCommand((socket) => {
    const subscriptions = new Map<string, () => void>();

    socket.on("graphql/execute", (message) => {
      // TODO: proper validation
      const id = message.id;
      const source = message.operation || message.body.query;
      const variables = message.variables;
      const operationName = message.operationName;

      graphql({
        schema,
        contextValue: { chat },
        rootValue: {},
        operationName,
        source,
        variableValues: variables,
      }).then((result) => {
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
        contextValue: { chat },
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
      // TODO: proper validation
      subscriptions.forEach((unsubscribe) => unsubscribe());
    });
  });

  return { router };
};
