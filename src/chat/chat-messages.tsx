import React from "react";
import { createPaginationContainer } from "react-relay";
import styled from "@emotion/styled/macro";
import graphql from "babel-plugin-relay/macro";
import { chatMessages_chat } from "./__generated__/chatMessages_chat.graphql";
import { ChatMessage } from "./chat-message";

const height = "400px";
const width = "500px";

const ChatMessageContainer = styled.div`
  position: relative;
  height: ${height};
  width: ${width};
`;

const StyledChatMessages = styled.div<{ disableScrollbar: boolean }>`
  overflow-y: scroll;
  position: absolute;
  bottom: 0;
  width: 100%;
  max-height: ${height};

  ::-webkit-scrollbar {
    width: ${(p) => (p.disableScrollbar ? "0 !important" : null)};
  }
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
    <ChatMessageContainer>
      <StyledChatMessages
        ref={ref}
        disableScrollbar={follow}
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
    </ChatMessageContainer>
  );
};

// Fetching more is not implemented yet. These all are just dummy values.
// We used a connection becaue it is easier documented how to add edges.
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
    getVariables: () => ({ count: 0, cursor: "NOT_IMPLEMENTED_YET" }),
    query: graphql`
      query chatMessagesQuery($count: Int!, $cursor: ID) {
        ...chatMessages_chat @arguments(count: $count, cursor: $cursor)
      }
    `,
  }
);
