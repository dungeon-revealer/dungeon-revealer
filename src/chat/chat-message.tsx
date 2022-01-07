import React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import styled from "@emotion/styled/macro";
import MarkdownView from "react-showdown";
import _sanitizeHtml from "sanitize-html";
import { useFragment } from "relay-hooks";
import {
  HStack,
  IconButton,
  Popover,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Portal,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Code,
} from "@chakra-ui/react";
import { useNoteWindowActions } from "../dm-area/token-info-aside";
import { SharableImage } from "../dm-area/components/sharable-image";
import * as Icon from "../feather-icons";
import * as Button from "../button";
import { chatMessageComponents } from "../user-content-components";
import type { chatMessage_message } from "./__generated__/chatMessage_message.graphql";
import { chatMessage_SharedResourceChatMessageFragment$key } from "./__generated__/chatMessage_SharedResourceChatMessageFragment.graphql";
import { DiceRoll, FormattedDiceRoll } from "./formatted-dice-roll";

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

type ReactComponent = (props: any) => React.ReactElement | null;

const { sanitizeHtml, components } = (() => {
  const allowedTags = [
    "div",
    "blockquote",
    "span",
    "em",
    "strong",
    "pre",
    "code",
    "img",
    "FormattedDiceRoll",
  ];

  const allowedAttributes: Record<string, Array<string>> = {
    span: ["style"],
    div: ["style"],
    img: ["src"],
    FormattedDiceRoll: ["index", "reference"],
  };

  const components: Record<string, ReactComponent> = {};

  for (const [name, config] of Object.entries(chatMessageComponents)) {
    if (typeof config === "function") {
      allowedTags.push(name);
      components[name] = config;
      continue;
    }
    if (typeof config === "object") {
      if (config.allowedAttributes != null) {
        allowedAttributes[name] = config.allowedAttributes;
        allowedTags.push(name);
        components[name] = config.Component;
      }
    }
  }

  const sanitizeHtml = (html: string) =>
    _sanitizeHtml(html, {
      allowedTags,
      allowedAttributes,
      transformTags: {
        // since our p element could also contain div elements and that makes react/the browser go brrrt
        // we simply convert them to div elements for now
        // in the future we might have a better solution.
        p: "div",
      },
      selfClosing: ["FormattedDiceRoll"],
      parser: {
        lowerCaseTags: false,
      },
    });

  return { sanitizeHtml, components };
})();

const TextRenderer: React.FC<{ text: string }> = ({ text }) => {
  return <MarkdownView markdown={text} sanitizeHtml={sanitizeHtml} />;
};

type DiceRollResultArray = Extract<
  chatMessage_message,
  { __typename: "UserChatMessage" }
>["diceRolls"];

export type DiceRollType = DiceRollResultArray[number];

type DiceRollResultContextValue = {
  diceRolls: DiceRollResultArray;
  referencedDiceRolls: DiceRollResultArray;
};

export const DiceRollResultContext =
  React.createContext<DiceRollResultContextValue>(
    // TODO: Use context that throws by default
    undefined as any
  );

const UserMessageRenderer = ({
  authorName,
  content,
  diceRolls,
  referencedDiceRolls,
}: {
  authorName: string;
  content: string;
  diceRolls: DiceRollResultArray;
  referencedDiceRolls: DiceRollResultArray;
}) => {
  const markdown = React.useMemo(
    () =>
      content.replace(
        /{(r)?(\d*)}/g,
        // prettier-ignore
        (_, isReferenced, index) => `<FormattedDiceRoll index="${index}"${isReferenced ? ` reference="yes"` : ``} />`
      ),
    [content]
  );

  return (
    <DiceRollResultContext.Provider value={{ diceRolls, referencedDiceRolls }}>
      <Container>
        <HStack justifyContent="space-between">
          <AuthorName>{authorName}: </AuthorName>
          {diceRolls.length || referencedDiceRolls.length ? (
            <Popover placement="left">
              <PopoverTrigger>
                <IconButton
                  aria-label="Show Info"
                  icon={<Icon.Info />}
                  size="sm"
                  variant="unstyled"
                />
              </PopoverTrigger>
              <Portal>
                <PopoverContent>
                  <PopoverHeader>Dice Rolls</PopoverHeader>
                  <PopoverCloseButton />
                  <PopoverBody>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>ID</Th>
                          <Th>Result</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {[...diceRolls, ...referencedDiceRolls].map((roll) => (
                          <Tr key={roll.rollId}>
                            <Td>
                              <Code>{roll.rollId}</Code>
                            </Td>
                            <Td>
                              <DiceRoll diceRoll={roll} />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </PopoverBody>
                </PopoverContent>
              </Portal>
            </Popover>
          ) : null}
        </HStack>
        <MarkdownView
          markdown={markdown}
          components={{ ...chatMessageComponents, FormattedDiceRoll }}
          sanitizeHtml={sanitizeHtml}
          options={{
            simpleLineBreaks: true,
          }}
        />
      </Container>
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
        <UserMessageRenderer
          authorName={message.authorName}
          content={message.content}
          diceRolls={message.diceRolls}
          referencedDiceRolls={message.referencedDiceRolls}
        />
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
          rollId
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
        referencedDiceRolls {
          rollId
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
