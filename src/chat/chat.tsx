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
import { useLogInMutation } from "./log-in-mutation";
import { chatUserUpdateSubscription } from "./__generated__/chatUserUpdateSubscription.graphql";

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

const UserUpdateSubscription = graphql`
  subscription chatUserUpdateSubscription {
    userUpdate {
      ... on UserRemoveUpdate {
        __typename
        userId
      }
      ... on UserAddUpdate {
        __typename
        user {
          id
          name
        }
      }
    }
  }
`;

const ChatQuery = graphql`
  query chatQuery {
    ...chatMessages_chat
    # TODO: move this stuff to own pagination/fragment container.
    users(first: 10000, after: "") @connection(key: "chat_users") {
      edges {
        cursor
        node {
          id
          name
        }
      }
    }
  }
`;

const ChatWindow = styled.div`
  padding: 12px;
  background-color: #fff;
  border-radius: 8px;
  font-size: 12px;
`;

const UserList = styled.div`
  padding: 12px;
  background-color: #fff;
  border-radius: 8px;
  font-size: 12px;
  width: 200px;
  margin-right: 12px;
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

  React.useEffect(() => {
    const subscription = requestSubscription<chatUserUpdateSubscription>(
      environment,
      {
        subscription: UserUpdateSubscription,
        variables: {},
        updater: (store) => {
          const users = ConnectionHandler.getConnection(
            store.getRoot(),
            "chat_users"
          );

          const updateRecord = store.getRootField("userUpdate");

          if (!users || !updateRecord) return;

          // TODO: typings could be better :)
          // see https://github.com/relay-tools/relay-compiler-language-typescript/issues/186
          if (updateRecord.getValue("__typename") === "UserAddUpdate") {
            const edge = ConnectionHandler.createEdge(
              store,
              users,
              updateRecord.getLinkedRecord("user"),
              "User"
            );
            ConnectionHandler.insertEdgeAfter(users, edge);
          } else if (
            updateRecord.getValue("__typename") === "UserRemoveUpdate"
          ) {
            const userId = updateRecord.getValue("userId");
            if (typeof userId !== "string") return;
            ConnectionHandler.deleteNode(users, userId);
          }
        },
      }
    );
    return () => subscription.dispose();
  }, [environment]);

  const logIn = useLogInMutation();

  React.useEffect(() => {
    logIn();
  }, [logIn]);

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
          <div style={{ display: "flex" }}>
            <UserList>
              {props.users.edges.map((edge) => (
                <div key={edge.node.id}>{edge.node.name}</div>
              ))}
            </UserList>
            <ChatWindow
              onContextMenu={(ev) => {
                ev.stopPropagation();
              }}
            >
              <ChatMessages chat={props} />
              <ChatTextArea />
              <div style={{ marginTop: 8 }}>
                <strong style={{}}>{props.users.edges.length}</strong> Connected
                User{props.users.edges.length === 1 ? "" : "s"}
              </div>
            </ChatWindow>
          </div>
        );
      }}
    />
  );
});
