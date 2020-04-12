import React from "react";
import styled from "@emotion/styled/macro";
import { convertHtml } from "../html-converter";

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

export const HtmlContainer: React.FC<{ markdown: string }> = React.memo(
  ({ markdown }) => {
    return (
      <HtmlContainerStyled
        dangerouslySetInnerHTML={{ __html: convertHtml(markdown) }}
      />
    );
  }
);
