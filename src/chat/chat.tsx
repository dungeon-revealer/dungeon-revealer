import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { QueryRenderer, requestSubscription } from "react-relay";
import { ConnectionHandler } from "relay-runtime";
import { useEnvironment } from "../relay-environment";
import { ChatMessages } from "./chat-messages";
import { chatSubscription } from "./__generated__/chatSubscription.graphql";
import { chatQuery } from "./__generated__/chatQuery.graphql";

import styled from "@emotion/styled/macro";
import { ChatTextArea } from "./chat-textarea";

const AppSubscription = graphql`
  subscription chatSubscription {
    chatMessagesAdded {
      messages {
        id
        ...chatMessage_message
      }
    }
  }
`;

const ChatQuery = graphql`
  query chatQuery {
    ...chatMessages_chat
  }
`;

const ChatWindow = styled.div`
  padding: 12px;
  background-color: #fff;
  border-radius: 8px;
  font-size: 12px;
`;

export const Chat: React.FC<{}> = React.memo(() => {
  const environment = useEnvironment();
  React.useEffect(() => {
    const subscription = requestSubscription<chatSubscription>(environment, {
      subscription: AppSubscription,
      variables: {},
      updater: (store) => {
        const chat = ConnectionHandler.getConnection(
          store.getRoot(),
          "chatMessages_chat"
        );

        const records = store
          .getRootField("chatMessagesAdded")
          ?.getLinkedRecords("messages");
        if (!chat || !records) return;

        for (const chatMessage of records) {
          const edge = ConnectionHandler.createEdge(
            store,
            chat,
            chatMessage,
            "ChatMessage"
          );
          ConnectionHandler.insertEdgeAfter(chat, edge);
        }
      },
    });
    return () => subscription.dispose();
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
          <ChatWindow
            onContextMenu={(ev) => {
              ev.stopPropagation();
            }}
          >
            <ChatMessages chat={props} />
            <ChatTextArea />
          </ChatWindow>
        );
      }}
    />
  );
});
