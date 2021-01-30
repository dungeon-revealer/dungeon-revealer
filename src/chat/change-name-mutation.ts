import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { useMutation } from "relay-hooks";
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
  const [mutate] = useMutation<changeNameMutation>(ChangeNameMutationDocument);

  const changeName = React.useCallback(
    ({ name }: { name: string }) => {
      mutate({
        variables: {
          input: { name },
        },
        onCompleted: (result) => {
          userSession.saveUser(result.changeName.me);
        },
      });
    },
    [mutate]
  );

  return changeName;
};
