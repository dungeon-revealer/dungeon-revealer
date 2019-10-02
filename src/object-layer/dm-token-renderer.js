import React from "react";
import { DmTokenMarker } from "./dm-token-marker";

export const DmTokenRenderer = React.memo(
  ({ tokens, getRelativePosition, updateToken }) => {
    return (
      <>
        {tokens.map(token => (
          <DmTokenMarker
            {...token}
            key={token.id}
            getRelativePosition={getRelativePosition}
            updateToken={props => updateToken({ ...props, id: token.id })}
          />
        ))}
      </>
    );
  }
);
