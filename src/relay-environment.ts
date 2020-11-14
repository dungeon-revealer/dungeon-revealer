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
import { Variables } from "react-relay";

export const createEnvironment = (socket: IOSocket) => {
  const networkInterface = createSocketIOGraphQLClient<GraphQLResponse, Error>(
    socket
  );

  const executeOperation = (
    request: RequestParameters,
    variables: Variables
  ): Observable<GraphQLResponse> => {
    if (!request.text) throw new Error("Missing document.");
    const { text: operation, name } = request;

    return Observable.create((sink) =>
      networkInterface.execute(
        {
          operation,
          variables,
          operationName: name,
        },
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
