import React from "react";
import styled from "@emotion/styled/macro";
import { ShowdownExtension } from "showdown";
import MarkdownView from "react-showdown";
import { SharableImage } from "./sharable-image";
import sanitizeHtml from "sanitize-html";
import { ChatMessageButton } from "./chat-message-button";
import { useStaticRef } from "../../hooks/use-static-ref";

const components = {
  Image: SharableImage,
  ChatMessage: ChatMessageButton,
};

const allowedTags = [...Object.keys(components), "div"];

/**
 * Multi line content for MDX properties is really hard.
 * In order to allow building complex chat messages we add a custom syntax:
 *
 * ```md
 * <ChatMessage>
 *  <DisplayText>
 *   This is the text that is displayed when rendering this component
 *  </DisplayText>
 *  <Message>
 *   This is the actual message that is sent when clicking on this button. It can contain dice rolls (like [1d20]).
 *   <Box>
 *     It is also possible to wrap content in custom components. **bold**
 *   </Box>
 *  </Message>
 * </ChatMessage>
 * ```
 */
const transformChatMessageExtension = (
  map: Map<string, string>
): ShowdownExtension => ({
  type: "lang",
  filter: (text) => {
    let finalText = "";
    let referenceCounter = 0;
    let startTagIndex: number;

    const START_TAG = "<ChatMessage>";
    const END_TAG = "</ChatMessage>";

    while ((startTagIndex = text.indexOf(START_TAG)) !== -1) {
      let endTagIndex = text.indexOf(END_TAG);
      if (endTagIndex === -1) break;

      const currentSubject = text.substring(
        startTagIndex + START_TAG.length,
        endTagIndex
      );

      const DISPLAY_TEXT_START_TAG = "<DisplayText>";
      const DISPLAY_TEXT_END_TAG = "</DisplayText>";
      const MESSAGE_TEXT_START_TAG = "<Message>";
      const MESSAGE_TEXT_END_TAG = "</Message>";

      const displayTextStartIndex = currentSubject.indexOf(
        DISPLAY_TEXT_START_TAG
      );
      const displayTextEndIndex = currentSubject.indexOf(DISPLAY_TEXT_END_TAG);
      const messageTextStartIndex = currentSubject.indexOf(
        MESSAGE_TEXT_START_TAG
      );
      const messageTextEndIndex = currentSubject.indexOf(MESSAGE_TEXT_END_TAG);

      if (
        displayTextStartIndex === -1 ||
        displayTextEndIndex === -1 ||
        messageTextStartIndex === -1 ||
        messageTextEndIndex === -1
      ) {
        finalText = finalText + text.substring(0, endTagIndex + END_TAG.length);
        text = text.substr(endTagIndex + END_TAG.length);
        continue;
      }

      const displayText = currentSubject.substr(
        displayTextStartIndex + DISPLAY_TEXT_START_TAG.length,
        displayTextEndIndex
      );
      const message = currentSubject.substr(
        messageTextStartIndex + MESSAGE_TEXT_START_TAG.length,
        messageTextEndIndex
      );

      finalText = finalText + text.substring(0, startTagIndex);

      // We store the reference in our map so we can access it later on the ChatMessage component level.
      const reference = referenceCounter;
      map.set(String(referenceCounter), message.replace(/^\s*/gm, ""));
      referenceCounter = referenceCounter + 1;
      finalText =
        finalText +
        `<ChatMessage message="$ref:${reference}">${displayText}</ChatMessage>`;
      text = text.substr(endTagIndex + END_TAG.length);
    }

    finalText = finalText + text;

    return finalText;
  },
});

const sanitizeHtmlExtension: ShowdownExtension = {
  type: "lang",
  filter: (text) => {
    const sanitizedHtml = sanitizeHtml(text, {
      allowedTags,
      allowedAttributes: {
        Image: ["id"],
        ChatMessage: ["message"],
      },
      selfClosing: ["Image"],
      parser: {
        lowerCaseTags: false,
      },
    });
    return sanitizedHtml;
  },
};

const HtmlContainerStyled = styled.div`
  flex-grow: 1;
  overflow-wrap: break-word;

  font-size: 12px;
  line-height: 1.5;

  blockquote {
    margin-left: 0;
    border-left: gray 12px solid;
    padding-left: 24px;
  }

  img {
    max-width: 100%;
  }

  p {
    margin-top: 0;
    margin-bottom: 4px;
  }
`;

export const ChatMessageReferenceContext = React.createContext<
  Map<string, string>
>(new Map());

export const HtmlContainer: React.FC<{ markdown: string }> = React.memo(
  ({ markdown }) => {
    const map = useStaticRef(() => new Map<string, string>());

    return (
      <ChatMessageReferenceContext.Provider value={map}>
        <HtmlContainerStyled>
          <MarkdownView
            markdown={markdown}
            extensions={[
              transformChatMessageExtension(map),
              sanitizeHtmlExtension,
            ]}
            components={components}
            options={{
              omitExtraWLInCodeBlocks: true,
              simpleLineBreaks: true,
            }}
          />
        </HtmlContainerStyled>
      </ChatMessageReferenceContext.Provider>
    );
  }
);
