import { useCallback } from "react";
import { useMutation } from "relay-hooks";
import graphql from "babel-plugin-relay/macro";
import { messageAddMutation } from "./__generated__/messageAddMutation.graphql";

const MessageAddMutationDocument = graphql`
  mutation messageAddMutation($input: ChatMessageCreateInput!) {
    chatMessageCreate(input: $input)
  }
`;

export const useMessageAddMutation = () => {
  const [mutation] = useMutation<messageAddMutation>(
    MessageAddMutationDocument
  );
  return useCallback(
    (input: { rawContent: string }) => {
      mutation({
        variables: { input },
      });
    },
    [mutation]
  );
};
