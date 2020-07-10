import React from "react";
import styled from "@emotion/styled/macro";
import { ShowdownExtension } from "showdown";
import MarkdownView from "react-showdown";
import { SharableImage } from "./sharable-image";
import _sanitizeHtml from "sanitize-html";
import { ChatMessageButton } from "./chat-message-button";
import { useStaticRef } from "../../hooks/use-static-ref";
import { NoteLink } from "./note-link";

const components = {
  Image: SharableImage,
  ChatMessage: ChatMessageButton,
  ChatMacro: ChatMessageButton,
  Link: NoteLink,
};

const allowedTags = [
  "a",
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
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "ul",
  "ol",
  "li",
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
      Link: ["id"],
      div: ["style"],
      span: ["style"],
      a: ["target", "rel", "href", "id"],
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesAppliedToAttributes: ["href"],
    selfClosing: ["Image"],
    parser: {
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
    },
    transformTags: {
      a: (name, attribs) => {
        if (attribs.href && /^https?:\/\//.test(attribs.href)) {
          return {
            tagName: "a",
            attribs: {
              ...attribs,
              href: attribs.href,
              target: "_BLANK",
              rel: "noopener",
            } as { [key: string]: string },
          };
        }
        return {
          tagName: "Link",
          attribs: {
            id: attribs.href || "",
          } as { [key: string]: string },
        };
      },
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
    max-width: 40em;
  }

  pre {
    border: 0.5px solid lightgray;
    border-radius: 2px;
    padding: 4px;
    background: #f8f8f8;
  }

  table {
    border-collapse: collapse;
  }

  td,
  th {
    border: 1px solid #999;
    padding: 0.5rem;
    text-align: left;
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
              tables: true,
            }}
          />
        </HtmlContainerStyled>
      </TemplateContext.Provider>
    );
  }
);
