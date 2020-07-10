import { commitMutation } from "react-relay";
import { useRelayEnvironment } from "relay-hooks";

import { useCallback } from "react";
import graphql from "babel-plugin-relay/macro";
import { messageAddMutation } from "./__generated__/messageAddMutation.graphql";

const MessageAddMutationDocument = graphql`
  mutation messageAddMutation($input: ChatMessageCreateInput!) {
    chatMessageCreate(input: $input)
  }
`;

export const useMessageAddMutation = () => {
  const environment = useRelayEnvironment();
  return useCallback(
    (input: { rawContent: string }) => {
      commitMutation<messageAddMutation>(environment, {
        mutation: MessageAddMutationDocument,
        variables: { input },
      });
    },
    [environment]
  );
};
