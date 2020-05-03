import React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import { chatMessage_message } from "./__generated__/chatMessage_message.graphql";
import styled from "@emotion/styled";

function format_two_digits(n: number) {
  return n < 10 ? "0" + n : n;
}

const formatTime = (t: string) => {
  const d = new Date(t);
  const hours = format_two_digits(d.getHours());
  const minutes = format_two_digits(d.getMinutes());
  return hours + ":" + minutes;
};

const Time = styled.span`
  line-height: inherit;
  font-size: 10px;
  padding-top: 5px;
  padding-right: 4px;
`;

const ChatMessageRenderer: React.FC<{
  message: chatMessage_message;
}> = React.memo(({ message }) => {
  return (
    <div style={{ display: "flex", paddingTop: 4, paddingBottom: 4 }}>
      <Time>{formatTime(message.createdAt)}</Time>
      <span style={{ fontWeight: "bold" }}>{message.authorName}</span>
      {": "}
      {message.rawContent}
    </div>
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
