import React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import { chatMessage_message } from "./__generated__/chatMessage_message.graphql";
import styled from "@emotion/styled";
import { FormattedDiceRoll } from "./formatted-dice-roll";

function formatTwoDigits(n: number) {
  return n < 10 ? "0" + n : n;
}

const formatTime = (t: string) => {
  const d = new Date(t);
  const hours = formatTwoDigits(d.getHours());
  const minutes = formatTwoDigits(d.getMinutes());
  return hours + ":" + minutes;
};

const Time = styled.div`
  line-height: inherit;
  font-size: 10px;
`;

const Container = styled.div`
  display: flex;
  margin-bottom: 8px;
`;

const Column = styled.div`
  > * {
    line-height: 24px;
  }
`;

const AuthorName = styled.div`
  display: inline-block;
  font-weight: bold;
  padding-right: 4px;
`;

const NormalText = styled.span``;

const ChatMessageRenderer: React.FC<{
  message: chatMessage_message;
}> = React.memo(({ message }) => {
  return (
    <Container>
      {/* <Column>
        <Time>{formatTime(message.createdAt)}</Time>
      </Column> */}
      <Column>
        <AuthorName>{message.authorName}: </AuthorName>
        {message.content.map((node, index) =>
          node.__typename === "ChatMessageTextNode" ? (
            <NormalText key={index}>{node.textContent}</NormalText>
          ) : node.__typename === "ChatMessageDiceRollNode" ? (
            <FormattedDiceRoll diceRoll={node.diceRollContent} key={index} />
          ) : null
        )}
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
      content {
        ... on ChatMessageTextNode {
          __typename
          textContent: content
        }
        ... on ChatMessageDiceRollNode {
          __typename
          diceRollContent: content {
            ...formattedDiceRoll_diceRoll
          }
        }
      }
    }
  `,
});
