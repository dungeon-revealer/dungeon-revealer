import * as React from "react";
import { commitMutation } from "react-relay";
import { useCallback } from "react";
import graphql from "babel-plugin-relay/macro";
import { useEnvironment } from "../relay-environment";
import { changeNameMutation } from "./__generated__/changeNameMutation.graphql";
import * as userSession from "./user-session";

const ChangeNameMutationDocument = graphql`
  mutation changeNameMutation($input: ChangeNameInput!) {
    changeName(input: $input) {
      me {
        id
        name
      }
    }
  }
`;

export const useChangeNameMutation = () => {
  const environment = useEnvironment();

  const changeName = React.useCallback(
    ({ name }: { name: string }) => {
      commitMutation<changeNameMutation>(environment, {
        mutation: ChangeNameMutationDocument,
        variables: {
          input: { name },
        },
        onCompleted: (result) => {
          userSession.saveUser(result.changeName.me);
        },
      });
    },
    [environment]
  );

  return changeName;
};
