import React from "react";
import { DmTokenMarker } from "./dm-token-marker";
import { useOvermind } from "../hooks/use-overmind";
import { SelectTokenMarkerReferenceModal } from "../dm-area/select-token-marker-reference-modal";

const ModalRenderer = ({ updateToken }) => {
  const { state } = useOvermind();

  return state.selectTokenMarkerReferenceModal.mode === "ACTIVE" ? (
    <SelectTokenMarkerReferenceModal updateToken={updateToken} />
  ) : null;
};

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
        <ModalRenderer updateToken={updateToken} />
      </g>
    );
  }
);
