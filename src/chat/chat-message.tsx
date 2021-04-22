import React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import type { chatMessage_message } from "./__generated__/chatMessage_message.graphql";
import styled from "@emotion/styled/macro";
import MarkdownView from "react-showdown";
import * as Button from "../button";
import { FormattedDiceRoll } from "./formatted-dice-roll";
import _sanitizeHtml from "sanitize-html";
import { chatMessageComponents } from "../user-content-components";
import { useFragment } from "relay-hooks";
import { chatMessage_SharedResourceChatMessageFragment$key } from "./__generated__/chatMessage_SharedResourceChatMessageFragment.graphql";
import { useNoteWindowActions } from "../dm-area/token-info-aside";
import { SharableImage } from "../dm-area/components/sharable-image";

const Container = styled.div`
  padding-bottom: 4px;
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
      "img",
      ...Object.keys(chatMessageComponents),
      "FormattedDiceRoll",
    ],
    allowedAttributes: {
      span: ["style"],
      div: ["style"],
      img: ["src"],
      FormattedDiceRoll: ["index"],
    },
    selfClosing: ["FormattedDiceRoll"],
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

type DiceRollResultArray = Extract<
  chatMessage_message,
  { __typename: "UserChatMessage" }
>["diceRolls"];

export const DiceRollResultContext = React.createContext<DiceRollResultArray>(
  // TODO: Use context that throws by default
  undefined as any
);

const UserMessageRenderer = ({
  content,
  diceRolls,
}: {
  content: string;
  diceRolls: Extract<
    chatMessage_message,
    { __typename: "UserChatMessage" }
  >["diceRolls"];
}) => {
  const markdown = React.useMemo(
    () =>
      content.replace(
        /{(\d*)}/g,
        (_, p1) => `<FormattedDiceRoll index="${p1}" />`
      ),
    [content]
  );
  return (
    <DiceRollResultContext.Provider value={diceRolls}>
      <MarkdownView
        markdown={markdown}
        components={{ ...chatMessageComponents, FormattedDiceRoll }}
        sanitizeHtml={sanitizeHtml}
        options={{
          simpleLineBreaks: true,
        }}
      />
    </DiceRollResultContext.Provider>
  );
};

const ChatMessage_SharedResourceChatMessageFragment = graphql`
  fragment chatMessage_SharedResourceChatMessageFragment on SharedResourceChatMessage {
    __typename
    authorName
    resource {
      ... on Note {
        __typename
        id
        documentId
        title
        contentPreview
      }
      ... on Image {
        __typename
        id
        imageId
      }
    }
  }
`;

const NoteCard = styled.div`
  border: 0.5px solid lightgrey;
  border-radius: 2px;
`;

const NoteTitle = styled.div`
  font-weight: bold;
  padding: 8px;
  padding-bottom: 4px;
`;

const NoteBody = styled.div`
  padding: 8px;
  padding-top: 0;
`;

const NoteFooter = styled.div`
  padding: 8px;
`;

const NotePreview: React.FC<{
  documentId: string;
  title: string;
  contentPreview: string;
}> = ({ documentId, title, contentPreview }) => {
  const noteWindowActions = useNoteWindowActions();
  return (
    <NoteCard>
      <NoteTitle>{title}</NoteTitle>
      <NoteBody>{contentPreview}</NoteBody>
      <NoteFooter>
        <Button.Primary
          small
          onClick={() =>
            noteWindowActions.focusOrShowNoteInNewWindow(documentId)
          }
        >
          Show
        </Button.Primary>
      </NoteFooter>
    </NoteCard>
  );
};

const SharedResourceRenderer: React.FC<{
  message: chatMessage_SharedResourceChatMessageFragment$key;
}> = ({ message: messageKey }) => {
  const message = useFragment(
    ChatMessage_SharedResourceChatMessageFragment,
    messageKey
  );

  let resourceContent: React.ReactNode = <strong>CONTENT UNAVAILABLE</strong>;

  if (message.resource) {
    switch (message.resource.__typename) {
      case "Note":
        resourceContent = (
          <NotePreview
            documentId={message.resource.documentId}
            title={message.resource.title}
            contentPreview={message.resource.contentPreview}
          />
        );
        break;
      case "Image":
        resourceContent = <SharableImage id={message.resource.imageId} />;
    }
  }

  return (
    <Container>
      <AuthorName>{message.authorName} shared </AuthorName>
      {resourceContent}
    </Container>
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
    case "SharedResourceChatMessage":
      return <SharedResourceRenderer message={message} />;
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
                crossedOut
              }
            }
          }
        }
      }
      ... on OperationalChatMessage {
        __typename
        content
      }
      ... on SharedResourceChatMessage {
        __typename
        ...chatMessage_SharedResourceChatMessageFragment
      }
    }
  `,
});
