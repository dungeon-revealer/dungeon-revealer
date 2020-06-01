import React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import type { chatMessage_message } from "./__generated__/chatMessage_message.graphql";
import styled from "@emotion/styled/macro";
import { ShowdownExtension } from "showdown";
import MarkdownView from "react-showdown";
import { FormattedDiceRoll } from "./formatted-dice-roll";
import sanitizeHtml from "sanitize-html";
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

const sanitizeHtmlExtension: ShowdownExtension = {
  type: "lang",
  filter: (text) => {
    return text.replace(/<div/g, '<div markdown="1"');
  },
};

const removePTags: ShowdownExtension = {
  type: "output",
  filter: function (text) {
    text = text.replace(/<\/?p[^>]*>/g, "");
    return text;
  },
};

const filterValidTags: ShowdownExtension = {
  type: "lang",
  filter: (text) => {
    // sanitizeHtml does escape > characters
    // we simple replace them by some string nobody would ever use
    // and replace it with a > after sanitizing
    text = text.replace(/^>/gm, "--:-=BLOCK_QUOTE=-:--");
    text = sanitizeHtml(text, {
      allowedTags: [
        "em",
        "strong",
        "span",
        "div",
        "blockquote",
        ...Object.keys(chatMessageComponents),
      ],
      allowedAttributes: {
        span: ["style"],
        div: ["style"],
      },
      parser: {
        lowerCaseTags: false,
      },
    });
    text = text.replace(/--:-=BLOCK_QUOTE=-:--/g, ">");
    return text;
  },
};

const showdownExtensions = [
  sanitizeHtmlExtension,
  removePTags,
  filterValidTags,
] as ShowdownExtension[];

const TextRenderer: React.FC<{ text: string }> = ({ text }) => {
  return <MarkdownView markdown={text} extensions={showdownExtensions} />;
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
      extensions={showdownExtensions}
      markdown={content}
      components={chatMessageComponents}
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
