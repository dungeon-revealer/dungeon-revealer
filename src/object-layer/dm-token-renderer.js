import React from "react";
import { DmTokenMarker } from "./dm-token-marker";

export const DmTokenRenderer = React.memo(
  ({
    tokens,
    getRelativePosition,
    updateToken,
    deleteToken,
    ratio,
    isDisabled,
    onClickToken,
  }) => {
    return (
      <g pointerEvents={isDisabled ? "none" : undefined}>
        {tokens.map((token) => (
          <DmTokenMarker
            token={token}
            key={token.id}
            getRelativePosition={getRelativePosition}
            updateToken={(props) => updateToken({ ...props, id: token.id })}
            deleteToken={() => deleteToken(token.id)}
            ratio={ratio}
            onClick={() => {
              onClickToken(token);
            }}
          />
        ))}
      </g>
    );
  }
);
