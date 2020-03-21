import React from "react";
import { DmTokenMarker } from "./dm-token-marker";
import { useOvermind } from "../hooks/use-overmind";
import { SelectTokenMarkerReferenceModal } from "../dm-area/select-token-marker-reference-modal";

const ModalRenderer = () => {
  const { state } = useOvermind();

  return state.selectTokenMarkerReferenceModal.mode === "ACTIVE" ? (
    <SelectTokenMarkerReferenceModal
    // let noteId = null;
    // eslint-disable-next-line default-case
    // switch (type) {
    //   case "NEW_NOTE": {
    //     const response = await localFetch(`/notes`, {
    //       method: "POST",
    //       body: JSON.stringify({}),
    //       headers: {
    //         "Content-Type": "application/json"
    //       }
    //     });
    //     const body = await response.json();
    //     noteId = body.data.note.id;
    //     break;
    //   }
    // case "EXISTING_NOTE": {
    //   actions.selectTokenMarkerReferenceModal.open();
    //   setShowChooseReferencedNoteModalDialog(false);
    //   return;
    // }
    // }
    // if (!noteId) return;
    // const reference = {
    //   type: "note",
    //   id: noteId
    // };
    // await updateToken({
    //   reference
    // });
    // setContextMenuCoordinates(null);
    // await actions.tokenInfoAside.toggleActiveToken({
    //   id: token.id,
    //   reference
    // });
    // setShowChooseReferencedNoteModalDialog(false);
    />
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
    onClickToken
  }) => {
    return (
      <g pointerEvents={isDisabled ? "none" : undefined}>
        {tokens.map(token => (
          <DmTokenMarker
            token={token}
            key={token.id}
            getRelativePosition={getRelativePosition}
            updateToken={props => updateToken({ ...props, id: token.id })}
            deleteToken={() => deleteToken(token.id)}
            ratio={ratio}
            onClick={() => {
              onClickToken(token);
            }}
          />
        ))}
        <ModalRenderer />
      </g>
    );
  }
);
