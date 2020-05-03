import React from "react";
import { createFragmentContainer } from "react-relay";
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
  chat,
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [follow, setFollow] = React.useState(true);
  React.useEffect(() => {
    if (!ref.current) return;
    if (follow === true) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [chat.messages, follow]);

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
      {chat.messages.map((message) => (
        <ChatMessage message={message} key={message.id} />
      ))}
    </StyledChatMessages>
  );
};

export const ChatMessages = createFragmentContainer(ChatMessagesRenderer, {
  chat: graphql`
    fragment chatMessages_chat on ChatMessageConnection {
      messages {
        ...chatMessage_message
        id
      }
    }
  `,
});
