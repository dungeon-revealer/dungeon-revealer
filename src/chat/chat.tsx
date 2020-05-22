import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { QueryRenderer, requestSubscription } from "react-relay";
import { ConnectionHandler } from "relay-runtime";
import { useEnvironment } from "../relay-environment";
import { ChatUserList } from "./chat-user-list";
import { ChatMessages } from "./chat-messages";
import { chatSubscription } from "./__generated__/chatSubscription.graphql";
import { chatQuery } from "./__generated__/chatQuery.graphql";
import * as Button from "../button";
import * as Icon from "../feather-icons";

import styled from "@emotion/styled/macro";
import { ChatTextArea } from "./chat-textarea";
import { useLogInMutation } from "./log-in-mutation";
import { chatUserUpdateSubscription } from "./__generated__/chatUserUpdateSubscription.graphql";
import { ChatOnlineUserIndicator } from "./chat-online-user-indicator";

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
    ...chatUserList_data
    ...chatOnlineUserIndicator_data
  }
`;

const ChatWindow = styled.div`
  padding: 12px;
  background-color: #fff;
  font-size: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

type HorizontalNavigationButtonProps = React.ComponentProps<
  typeof Button.Tertiary
> & { isActive: boolean };

const HorizontalNavigationButton = styled(Button.Tertiary)<
  HorizontalNavigationButtonProps
>`
  border-right: none;
  border: 1px solid rgb(203, 210, 217);
  white-space: nowrap;

  background-color: ${(p) => (p.isActive ? "#044e54" : null)};
  color: ${(p) => (p.isActive ? "#fff" : null)};
  border-color: ${(p) => (p.isActive ? "#044e54" : null)};

  &:hover {
    background-color: ${(p) => (p.isActive ? "#044e54" : null)};
  }

  &:first-child {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 0;
  }

  &:not(:last-child):not(:first-child) {
    border-radius: unset;
    border-right: none;
  }

  &:last-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-right: 1px solid rgb(203, 210, 217);
  }
`;

export const Chat: React.FC<{}> = React.memo(() => {
  const [mode, setMode] = React.useState<"chat" | "user" | "settings">("chat");
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
            "chatUserList_users"
          );

          const updateRecord = store.getRootField("userUpdate");
          const root = store.getRoot();
          const usersCountField = root.getValue("usersCount") as number;

          if (!users || !updateRecord) return;

          console.log({ usersCountField });

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
            root.setValue(usersCountField + 1, "usersCount");
          } else if (
            updateRecord.getValue("__typename") === "UserRemoveUpdate"
          ) {
            const userId = updateRecord.getValue("userId");
            if (typeof userId !== "string") return;
            ConnectionHandler.deleteNode(users, userId);
            root.setValue(usersCountField - 1, "usersCount");
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
          <ChatWindow
            onContextMenu={(ev) => {
              ev.stopPropagation();
            }}
          >
            <div style={{ display: "flex", marginBottom: 8 }}>
              <HorizontalNavigationButton
                small
                isActive={mode === "chat"}
                fullWidth
                onClick={() => setMode("chat")}
              >
                <Icon.MessageCircleIcon height={12} width={12} />
                <span>Chat</span>
              </HorizontalNavigationButton>
              <HorizontalNavigationButton
                small
                isActive={mode === "user"}
                fullWidth
                onClick={() => setMode("user")}
              >
                <Icon.UsersIcon height={12} width={12} />
                <span>
                  Users (<ChatOnlineUserIndicator data={props} />)
                </span>
              </HorizontalNavigationButton>
              <HorizontalNavigationButton
                small
                isActive={mode === "settings"}
                fullWidth
                onClick={() => setMode("settings")}
              >
                <Icon.SettingsIcon height={12} width={12} />
                <span>Settings</span>
              </HorizontalNavigationButton>
            </div>
            {mode === "chat" ? (
              <>
                <ChatMessages chat={props} />
                <ChatTextArea />
              </>
            ) : mode === "user" ? (
              <div style={{ marginTop: 8 }}>
                <ChatUserList data={props} />
              </div>
            ) : mode === "settings" ? (
              <div style={{ marginTop: 8 }}></div>
            ) : null}
          </ChatWindow>
        );
      }}
    />
  );
});
