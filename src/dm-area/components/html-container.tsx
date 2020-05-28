import React from "react";
import styled from "@emotion/styled/macro";
import { ShowdownExtension } from "showdown";
import MarkdownView from "react-showdown";
import { SharableImage } from "./sharable-image";
import sanitizeHtml from "sanitize-html";
import { ChatMessageButton } from "./chat-message-button";

const components = {
  Image: SharableImage,
  ChatMessage: ChatMessageButton,
};

const allowedTags = Object.keys(components);

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

const extensions = [sanitizeHtmlExtension];

export const HtmlContainer: React.FC<{ markdown: string }> = React.memo(
  ({ markdown }) => {
    return (
      <HtmlContainerStyled>
        <MarkdownView
          markdown={markdown}
          extensions={extensions}
          components={components}
        />
      </HtmlContainerStyled>
    );
  }
);
