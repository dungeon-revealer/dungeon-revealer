import React from "react";
import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
  SubscribeFunction,
  Observable,
  GraphQLResponse,
} from "relay-runtime";
import { RelayModernEnvironment } from "relay-runtime/lib/store/RelayModernEnvironment";
import { Sink } from "relay-runtime/lib/network/RelayObservable";

export const createEnvironment = (socket: SocketIO.Socket) => {
  const responseHandlers = new Map<number, (result: GraphQLResponse) => void>();
  const subscriptionHandlers = new Map<number, Sink<GraphQLResponse>>();
  let operationIdCounter = 1;

  socket.on("graphql/result", ({ id, ...result }) => {
    const handler = responseHandlers.get(id);
    handler?.(result);
    responseHandlers.delete(id);
  });

  socket.on("graphql/update", ({ id, ...result }) => {
    const sink = subscriptionHandlers.get(id);
    console.log("received update", result, sink);
    if (!sink) return;
    sink.next(result);
  });

  const fetchQuery: FetchFunction = (request, variables) => {
    if (!request.text) throw new Error("Missing document.");
    const { text: operation } = request;
    const operationId = operationIdCounter;
    operationIdCounter = operationIdCounter + 1;

    return new Promise<GraphQLResponse>((resolve) => {
      const responseHandler = (response: any) => resolve(response);
      responseHandlers.set(operationId, responseHandler);

      socket.emit("graphql/execute", {
        id: operationId,
        operation,
        variables,
      });
    });
  };

  const setupSubscription: SubscribeFunction = (request, variables) => {
    if (!request.text) throw new Error("Missing document.");
    const { text: operation } = request;

    return Observable.create((sink) => {
      const operationId = operationIdCounter;
      operationIdCounter = operationIdCounter + 1;
      socket.emit("graphql/subscribe", {
        id: operationId,
        operation,
        variables,
      });

      subscriptionHandlers.set(operationId, sink);

      return () => {
        socket.emit("graphql/unsubscribe", { id: operationId });
        subscriptionHandlers.delete(operationId);
      };
    });
  };

  return new Environment({
    network: Network.create(fetchQuery, setupSubscription),
    store: new Store(new RecordSource()),
  });
};

export const EnvironmentContext = React.createContext<RelayModernEnvironment | null>(
  null
);

export const RelayEnvironmentProvider = EnvironmentContext.Provider;

export const useEnvironment = (): RelayModernEnvironment => {
  const environment = React.useContext(EnvironmentContext);
  if (!environment) throw new Error("Missing Environment");
  return environment;
};
