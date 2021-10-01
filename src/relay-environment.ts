import {
  Environment,
  Network,
  RecordSource,
  Store,
  Observable,
  GraphQLResponse,
  RequestParameters,
} from "relay-runtime";
import { Socket as IOSocket } from "socket.io-client";
import { createSocketIOGraphQLClient } from "@n1ru4l/socket-io-graphql-client";
import { applyAsyncIterableIteratorToSink } from "@n1ru4l/push-pull-async-iterable-iterator";
import { applyLiveQueryJSONDiffPatch } from "@n1ru4l/graphql-live-query-patch-jsondiffpatch";
import { Variables } from "react-relay";

export const createEnvironment = (socket: IOSocket) => {
  const networkInterface = createSocketIOGraphQLClient<GraphQLResponse>(socket);

  const executeOperation = (
    request: RequestParameters,
    variables: Variables
  ): Observable<GraphQLResponse> => {
    if (!request.text) throw new Error("Missing document.");
    const { text: operation, name } = request;

    return Observable.create((sink) =>
      applyAsyncIterableIteratorToSink(
        applyLiveQueryJSONDiffPatch(
          networkInterface.execute({
            operation,
            variables,
            operationName: name,
          })
        ),
        sink
      )
    );
  };

  const environment = new Environment({
    network: Network.create(executeOperation, executeOperation),
    store: new Store(new RecordSource()),
  });

  return environment;
};
