import React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import { chatMessage_message } from "./__generated__/chatMessage_message.graphql";
import styled from "@emotion/styled";
import { FormattedDiceRoll } from "./formatted-dice-roll";

const Container = styled.div`
  margin-bottom: 4px;
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
      <AuthorName>{message.authorName}: </AuthorName>
      {message.content.map((node, index) =>
        node.__typename === "ChatMessageTextNode" ? (
          <NormalText key={index}>{node.textContent}</NormalText>
        ) : node.__typename === "ChatMessageDiceRollNode" ? (
          <FormattedDiceRoll diceRoll={node.diceRollContent} key={index} />
        ) : null
      )}
    </Container>
  );
});

export const ChatMessage = createFragmentContainer(ChatMessageRenderer, {
  message: graphql`
    fragment chatMessage_message on ChatMessage {
      id
      authorName
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
