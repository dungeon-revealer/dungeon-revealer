import React from "react";
import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
  SubscribeFunction,
  Observable,
} from "relay-runtime";
import { createSocketIOGraphQLClient } from "@n1ru4l/socket-io-graphql-client";

export const createEnvironment = (socket: SocketIOClient.Socket) => {
  const networkInterface = createSocketIOGraphQLClient(socket);

  const fetchQuery: FetchFunction = (request, variables) => {
    if (!request.text) throw new Error("Missing document.");
    const { text: operation, name } = request;

    return Observable.create((sink) => {
      const observable = networkInterface.execute({
        operation,
        variables,
        operationName: name,
      });

      const subscription = observable.subscribe(sink);

      return () => {
        subscription.unsubscribe();
      };
    });
  };

  const setupSubscription: SubscribeFunction = (request, variables) => {
    if (!request.text) throw new Error("Missing document.");
    const { text: operation, name } = request;

    return Observable.create((sink) => {
      const observable = networkInterface.execute({
        operation,
        variables: variables,
        operationName: name,
      });

      const subscription = observable.subscribe(sink);

      return () => {
        subscription.unsubscribe();
      };
    });
  };

  const environment = new Environment({
    network: Network.create(fetchQuery, setupSubscription),
    store: new Store(new RecordSource()),
  });

  return environment;
};
