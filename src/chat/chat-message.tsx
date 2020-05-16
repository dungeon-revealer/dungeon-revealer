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
  margin-top: 6px;
  padding-right: 4px;
`;

const Container = styled.div`
  display: flex;
`;

const Column = styled.div`
  padding-bottom: 4px;
  padding-top: 4px;
`;

const AuthorName = styled.div`
  display: inline-block;
  padding: 4px;
  font-weight: bold;
`;

const NormalText = styled.span`
  padding: 4px 0;
  line-height: 18px;
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
        <AuthorName>{message.authorName} </AuthorName>
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
