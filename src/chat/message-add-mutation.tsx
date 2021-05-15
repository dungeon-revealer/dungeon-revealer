import * as React from "react";
import { useMutation } from "relay-hooks";
import graphql from "babel-plugin-relay/macro";
import { messageAddMutation } from "./__generated__/messageAddMutation.graphql";
import { useToast, Code } from "@chakra-ui/react";

const MessageAddMutationDocument = graphql`
  mutation messageAddMutation($input: ChatMessageCreateInput!) {
    chatMessageCreate(input: $input) {
      error {
        reason
      }
    }
  }
`;

export const useMessageAddMutation = () => {
  const showToast = useToast();

  const [mutation] = useMutation<messageAddMutation>(
    MessageAddMutationDocument,
    React.useMemo(
      () => ({
        onCompleted: (result) => {
          if (result.chatMessageCreate.error) {
            showToast({
              title: `Error while evaluating template`,
              description: (
                <Code
                  overflowX="scroll"
                  display="block"
                  whiteSpace="pre"
                  children={result.chatMessageCreate.error.reason}
                  background="transparent"
                  color="white"
                  marginInlineEnd="2"
                />
              ),
              status: "error",
              duration: null,
              isClosable: true,
              position: "top",
            });
          }
        },
      }),
      []
    )
  );
  return React.useCallback(
    (input: { rawContent: string; variables?: string }) => {
      mutation({
        variables: { input },
      });
    },
    [mutation]
  );
};
