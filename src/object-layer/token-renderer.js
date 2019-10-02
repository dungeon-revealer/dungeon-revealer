import React from "react";
import { TokenMarker } from "./token-marker";

export const TokenRenderer = React.memo(({ tokens, ratio }) => {
  return (
    <>
      {tokens.map(token => (
        <TokenMarker {...token} key={token.id} ratio={ratio} />
      ))}
    </>
  );
});
