import * as React from "react";
import styled from "@emotion/styled/macro";

const Box = styled.div`
  border: 0.5px solid lightgrey;
  padding: 8px;
  border-radius: 2px;
`;

const BoxRow = styled.div`
  display: flex;
`;

const BoxColumn = styled.div<{ size: number }>`
  flex: ${(p) => p.size || 1};
`;

type ReactComponent = (props: any) => React.ReactElement | null;

type Config = {
  [name: string]:
    | ReactComponent
    | {
        Component: ReactComponent;
        allowedAttributes: Array<string>;
      };
};

/**
 * These components can be used in chat messages.
 */
export const chatMessageComponents: Config = {
  Box,
  BoxRow,
  BoxColumn,
};
