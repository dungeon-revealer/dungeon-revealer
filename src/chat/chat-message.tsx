import React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import { chatMessage_message } from "./__generated__/chatMessage_message.graphql";
import styled from "@emotion/styled";

function formatTwoDigits(n: number) {
  return n < 10 ? "0" + n : n;
}

const formatTime = (t: string) => {
  const d = new Date(t);
  const hours = formatTwoDigits(d.getHours());
  const minutes = formatTwoDigits(d.getMinutes());
  return hours + ":" + minutes;
};

const Time = styled.span`
  line-height: inherit;
  font-size: 10px;
  padding-top: 4px;
  padding-right: 4px;
`;

const Container = styled.div`
  display: flex;
`;

const Column = styled.div`
  padding-bottom: 4px;
  padding-top: 4px;
`;

const AuthorName = styled.span`
  font-weight: bold;
`;

const ChatMessageRenderer: React.FC<{
  message: chatMessage_message;
}> = React.memo(({ message }) => {
  return (
    <Container>
      <Column>
        <Time>{formatTime(message.createdAt)}</Time>
      </Column>
      <Column>
        <AuthorName style={{ fontWeight: "bold" }}>
          {message.authorName}{" "}
        </AuthorName>
        {message.rawContent}
      </Column>
    </Container>
  );
});

export const ChatMessage = createFragmentContainer(ChatMessageRenderer, {
  message: graphql`
    fragment chatMessage_message on ChatMessage {
      id
      authorName
      createdAt
      rawContent
    }
  `,
});
