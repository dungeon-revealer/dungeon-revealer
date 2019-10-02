import React from "react";
import { DmTokenMarker } from "./token-marker";

export const DmTokenRenderer = React.memo(
  ({ tokens, getRelativePosition, updateTokenPosition }) => {
    return (
      <>
        {tokens.map(token => (
          <DmTokenMarker
            {...token}
            key={token.id}
            getRelativePosition={getRelativePosition}
            updateTokenPosition={props =>
              updateTokenPosition({ ...props, id: token.id })
            }
          />
        ))}
      </>
    );
  }
);
