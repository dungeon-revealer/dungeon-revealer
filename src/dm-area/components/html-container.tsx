import React from "react";
import styled from "@emotion/styled/macro";
import { ShowdownExtension } from "showdown";
import MarkdownView from "react-showdown";
import { SharableImage } from "./sharable-image";

const imageExtension: ShowdownExtension = {
  type: "lang",
  filter: function (text) {
    const regex = /\!\[(.*)\]\((\/.*)\)/;
    const res = text.match(regex);
    if (res === null) return text;
    return `<SharableImage src="${res[2]}" />`;
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

const extensions = [imageExtension];

const components = {
  SharableImage,
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
