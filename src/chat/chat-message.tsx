import React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import type { chatMessage_message } from "./__generated__/chatMessage_message.graphql";
import styled from "@emotion/styled/macro";
import MarkdownView from "react-showdown";
import { FormattedDiceRoll } from "./formatted-dice-roll";
import _sanitizeHtml from "sanitize-html";
import { chatMessageComponents } from "../user-content-components";

const Container = styled.div`
  margin-bottom: 4px;
  > * {
    line-height: 24px;
  }
`;

const AuthorName = styled.div`
  display: block;
  font-weight: bold;
`;

const sanitizeHtml = (html: string) =>
  _sanitizeHtml(html, {
    allowedTags: [
      "div",
      "blockquote",
      "span",
      "em",
      "strong",
      "pre",
      "code",
      ...Object.keys(chatMessageComponents),
    ],
    allowedAttributes: {
      span: ["style"],
      div: ["style"],
    },
    transformTags: {
      // since our p element could also contain div elements and that makes react/the browser go brrrt
      // we simply convert them to div elements for now
      // in the future we might have a better solution.
      p: "div",
    },
    parser: {
      lowerCaseTags: false,
    },
  });

const TextRenderer: React.FC<{ text: string }> = ({ text }) => {
  return <MarkdownView markdown={text} sanitizeHtml={sanitizeHtml} />;
};

const UserMessageRenderer: React.FC<{
  content: string;
  diceRolls: Extract<
    chatMessage_message,
    { __typename: "UserChatMessage" }
  >["diceRolls"];
}> = ({ content, diceRolls }) => {
  return (
    <MarkdownView
      markdown={content}
      components={chatMessageComponents}
      sanitizeHtml={sanitizeHtml}
      /**
       * We monkey patched MarkdownView.
       * We replace the "{number}" placeholders with our actual dice roll components, so they are embedded nicely :)
       * E.g. "{0}" -> <FormattedDiceRoll diceRoll={diceRolls[0]} />
       */
      MONKEY_PATCHED_textMapper={(text) => {
        const parts = text.split(/({\d*})/).filter(Boolean);
        const nodes: React.ReactNode[] = [];
        for (const part of parts) {
          if (part.startsWith("{") && part.endsWith("}")) {
            const index = parseInt(part.substr(1, part.length - 1), 10);
            if (diceRolls[index]) {
              const content = (
                <FormattedDiceRoll
                  diceRoll={diceRolls[index]}
                  key={`dice_roll_${index}`}
                />
              );
              nodes.push(content);
            } else {
              nodes.push(part);
            }
          } else {
            nodes.push(part);
          }
        }
        return nodes;
      }}
      options={{
        simpleLineBreaks: true,
      }}
    />
  );
};

const ChatMessageRenderer: React.FC<{
  message: chatMessage_message;
}> = React.memo(({ message }) => {
  switch (message.__typename) {
    case "UserChatMessage":
      return (
        <Container>
          <AuthorName>{message.authorName}: </AuthorName>
          <UserMessageRenderer
            content={message.content}
            diceRolls={message.diceRolls}
          />
        </Container>
      );
    case "OperationalChatMessage":
      return (
        <Container>
          <TextRenderer text={message.content} />
        </Container>
      );
    default:
      return null;
  }
});

export const ChatMessage = createFragmentContainer(ChatMessageRenderer, {
  message: graphql`
    fragment chatMessage_message on ChatMessage {
      ... on UserChatMessage {
        __typename
        authorName
        content
        diceRolls {
          result
          detail {
            ... on DiceRollOperatorNode {
              __typename
              content
            }
            ... on DiceRollConstantNode {
              __typename
              content
            }
            ... on DiceRollOpenParenNode {
              __typename
              content
            }
            ... on DiceRollCloseParenNode {
              __typename
              content
            }
            ... on DiceRollDiceRollNode {
              __typename
              content
              rollResults {
                dice
                result
                category
              }
            }
          }
        }
      }
      ... on OperationalChatMessage {
        __typename
        content
      }
    }
  `,
});
