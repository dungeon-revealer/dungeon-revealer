import React from "react";
import { DmTokenMarker } from "./token-marker";

export const TokenRenderer = React.memo(({ tokens }) => {
  return (
    <>
      {tokens.map(token => (
        <DmTokenMarker {...token} key={token.id} />
      ))}
    </>
  );
});
