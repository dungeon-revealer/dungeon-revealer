import React from "react";
import { createPaginationContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import { chatMessages_chat } from "./__generated__/chatMessages_chat.graphql";
import { ChatMessage } from "./chat-message";
import styled from "@emotion/styled/macro";

const StyledChatMessages = styled.div`
  overflow-y: scroll;
  height: 400px;
  width: 500px;
`;

const ChatMessagesRenderer: React.FC<{ chat: chatMessages_chat }> = ({
  chat: { chat },
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [follow, setFollow] = React.useState(true);

  React.useEffect(() => {
    if (!ref.current) return;
    if (follow === true) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [chat.edges, follow]);

  return (
    <StyledChatMessages
      ref={ref}
      onScroll={() => {
        if (!ref.current) return;
        const target: HTMLElement = ref.current;
        if (target.scrollTop !== target.scrollHeight - target.clientHeight) {
          setFollow(false);
        } else {
          setFollow(true);
        }
      }}
    >
      {chat.edges.map((edge) => (
        <ChatMessage message={edge.node} key={edge.node.id} />
      ))}
    </StyledChatMessages>
  );
};

export const ChatMessages = createPaginationContainer(
  ChatMessagesRenderer,
  {
    chat: graphql`
      fragment chatMessages_chat on Query
        @argumentDefinitions(
          count: { type: "Int", defaultValue: 10 }
          cursor: { type: "ID" }
        ) {
        chat(first: $count, after: $cursor)
          @connection(key: "chatMessages_chat") {
          edges {
            node {
              id
              ...chatMessage_message
            }
          }
        }
      }
    `,
  },
  {
    getVariables: () => ({ count: 0, cursor: "lel" }),
    query: graphql`
      query chatMessagesQuery($count: Int!, $cursor: ID) {
        ...chatMessages_chat @arguments(count: $count, cursor: $cursor)
      }
    `,
  }
);
