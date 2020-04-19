import React from "react";
import styled from "@emotion/styled/macro";
import { ShowdownExtension } from "showdown";
import MarkdownView from "react-showdown";
import { SharableImage } from "./sharable-image";
import sanitizeHtml from "sanitize-html";

const sanitizeHtmlExtension: ShowdownExtension = {
  type: "lang",
  filter: (text) => {
    const sanitizedHtml = sanitizeHtml(text, {
      allowedTags: ["Image"],
      allowedAttributes: {
        Image: ["id"],
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

  blockquote {
    margin-left: 0;
    border-left: gray 12px solid;
    padding-left: 24px;
  }

  img {
    max-width: 100%;
  }
`;

const extensions = [sanitizeHtmlExtension];

const components = {
  Image: SharableImage,
};

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
