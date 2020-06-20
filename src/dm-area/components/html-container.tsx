import React from "react";
import styled from "@emotion/styled/macro";
import { ShowdownExtension } from "showdown";
import MarkdownView from "react-showdown";
import { SharableImage } from "./sharable-image";
import _sanitizeHtml from "sanitize-html";
import { ChatMessageButton } from "./chat-message-button";
import { useStaticRef } from "../../hooks/use-static-ref";

const components = {
  Image: SharableImage,
  ChatMessage: ChatMessageButton,
  ChatMacro: ChatMessageButton,
};

const allowedTags = [
  "div",
  "p",
  "blockquote",
  "span",
  "em",
  "strong",
  "pre",
  "code",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  ...Object.keys(components),
];

const transformTemplateExtension = (
  templateMap: Map<string, string>
): ShowdownExtension => ({
  type: "lang",
  filter: (text) => {
    let finalText = "";
    let startTagMatch: null | RegExpExecArray;

    const START_TAG = /<Template(?:[^>]*)id="([\w_-]*)"(?:[^>]*)>/;
    const END_TAG = "</Template>";

    while ((startTagMatch = START_TAG.exec(text)) !== null) {
      let endTagIndex = text.indexOf(END_TAG);
      if (endTagIndex === -1) break;

      const matchStringLength = startTagMatch[0].length;
      const templateId = startTagMatch[1];

      const templateContents = text.substring(
        startTagMatch.index + matchStringLength,
        endTagIndex
      );
      templateMap.set(templateId, templateContents.replace(/^\s*/gm, ""));
      finalText = finalText + text.substring(0, startTagMatch.index);
      text = text.substr(endTagIndex + END_TAG.length);
    }
    finalText = finalText + text;
    return finalText;
  },
});

const sanitizeHtml = (html: string) =>
  _sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      Image: ["id"],
      ChatMacro: ["message", "templateId", "var-*"],
      // alias for ChatMessage
      ChatMessage: ["message", "templateId", "var-*"],
      div: ["style"],
      span: ["style"],
    },
    selfClosing: ["Image"],
    parser: {
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
    },
  });

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

  pre {
    border: 0.5px solid lightgray;
    border-radius: 2px;
    padding: 4px;
    background: #f8f8f8;
  }
`;

export const TemplateContext = React.createContext<Map<string, string>>(
  new Map()
);

export const HtmlContainer: React.FC<{ markdown: string }> = React.memo(
  ({ markdown }) => {
    const templateMap = useStaticRef(() => new Map<string, string>());

    return (
      <TemplateContext.Provider value={templateMap}>
        <HtmlContainerStyled>
          <MarkdownView
            sanitizeHtml={sanitizeHtml}
            markdown={markdown}
            extensions={[transformTemplateExtension(templateMap)]}
            components={components}
            options={{
              simpleLineBreaks: true,
            }}
          />
        </HtmlContainerStyled>
      </TemplateContext.Provider>
    );
  }
);
