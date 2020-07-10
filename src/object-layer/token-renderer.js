import React from "react";
import { TokenMarkerRenderer } from "./token-marker-renderer";

export const TokenRenderer = React.memo(
  ({
    mode,
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
          <TokenMarkerRenderer
            mode={mode}
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
