import * as React from "react";
import { commitMutation } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import { useRelayEnvironment } from "relay-hooks";
import { logInMutation } from "./__generated__/logInMutation.graphql";
import { useGetIsMounted } from "../hooks/use-get-is-mounted";
import * as userSession from "./user-session";

const LogInMutationDocument = graphql`
  mutation logInMutation($input: LogInInput) {
    logIn(input: $input) {
      user {
        id
        name
      }
    }
  }
`;

/**
 * This mutation is used for logging in into the chat
 * In The future we can use a password/secret instead of the id/login for authentication.
 * The session is stored in the local storage.
 */
export const useLogInMutation = (): [boolean, () => Promise<void>] => {
  const environment = useRelayEnvironment();
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const getIsMounted = useGetIsMounted();

  const logIn = React.useCallback(() => {
    const input = userSession.getUser();

    return new Promise<void>((resolve, reject) => {
      commitMutation<logInMutation>(environment, {
        mutation: LogInMutationDocument,
        variables: {
          input,
        },
        onError: () => reject(),
        onCompleted: (result) => {
          userSession.saveUser(result.logIn.user);
          if (getIsMounted()) {
            setIsLoggedIn(true);
          }
          resolve();
        },
      });
    });
  }, [environment]);

  return [isLoggedIn, logIn];
};
