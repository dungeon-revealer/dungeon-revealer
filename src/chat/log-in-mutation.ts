import { commitMutation } from "react-relay";
import { useCallback } from "react";
import graphql from "babel-plugin-relay/macro";
import { useEnvironment } from "../relay-environment";
import { logInMutation } from "./__generated__/logInMutation.graphql";

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

const readUserFromLocalStorage = () => {
  const user = localStorage.getItem("user");
  if (user == null) return null;
  try {
    const record = JSON.parse(user);
    if (!record) return null;
    if (typeof record.id === "string" && typeof record.name === "string") {
      return record as { id: string; name: string };
    }
  } catch (err) {}
  return null;
};

const writeUserToLocalStorage = (user: { id: string; name: string }) => {
  localStorage.setItem("user", JSON.stringify(user));
};

/**
 * This mutation is used for logging in into the chat
 * In The future we can use a password/secret instead of the id/login for authentication.
 * The session is stored in the local storage.
 */
export const useLogInMutation = () => {
  const environment = useEnvironment();
  return useCallback(() => {
    const input = readUserFromLocalStorage();

    commitMutation<logInMutation>(environment, {
      mutation: LogInMutationDocument,
      variables: {
        input,
      },
      onCompleted: (result) => {
        writeUserToLocalStorage(result.logIn.user);
      },
    });
  }, [environment]);
};
