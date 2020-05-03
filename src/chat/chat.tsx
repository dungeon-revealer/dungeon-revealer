import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { QueryRenderer, requestSubscription } from "react-relay";
import { useEnvironment } from "../relay-environment";
import { ChatMessages } from "./chat-messages";
import { chatSubscription } from "./__generated__/chatSubscription.graphql";
import { chatQuery } from "./__generated__/chatQuery.graphql";
import { applyJSONPatchToRelayStore } from "../apply-json-patch-to-relay-store";
import styled from "@emotion/styled/macro";
import { ChatTextArea } from "./chat-textarea";

const AppSubscription = graphql`
  subscription chatSubscription {
    chat {
      query {
        ...chatMessages_chat
      }
      patch {
        op
        from
        path
        value
      }
    }
  }
`;

const ChatQuery = graphql`
  query chatQuery {
    chat {
      ...chatMessages_chat
    }
  }
`;

const ChatWindow = styled.div`
  padding: 12px;
  background-color: #fff;
  border-radius: 8px;
`;

export const Chat: React.FC<{}> = () => {
  const environment = useEnvironment();
  React.useEffect(() => {
    requestSubscription<chatSubscription>(environment, {
      subscription: AppSubscription,
      variables: {},
      updater: (store) => {
        const rootField = store.getRootField("chat");
        if (!rootField) return;
        const patch = rootField.getLinkedRecords("patch");
        if (patch) applyJSONPatchToRelayStore(store, "chat", patch);
      },
    });
  }, [environment]);

  return (
    <QueryRenderer<chatQuery>
      query={ChatQuery}
      environment={environment}
      variables={{}}
      render={({ error, props }) => {
        if (error) {
          return null;
        }
        if (!props) {
          return null;
        }
        return (
          <ChatWindow>
            <ChatMessages chat={props.chat} />
            <ChatTextArea />
          </ChatWindow>
        );
      }}
    />
  );
};
