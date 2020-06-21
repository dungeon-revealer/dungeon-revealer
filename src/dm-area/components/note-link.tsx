import * as React from "react";
import { SetActiveNoteIdContext } from "../token-info-aside";
import { StyledChatMessageButton } from "./chat-message-button";

export const NoteLink: React.FC<{ id?: string }> = (props) => {
  const setActiveNoteId = React.useContext(SetActiveNoteIdContext);
  const id = props.id ?? null;

  if (id === null) {
    return <>{props.children ?? null}</>;
  }

  return (
    <StyledChatMessageButton
      // TODO: We should not do the encoding on the frontend 🤔
      onClick={() => setActiveNoteId(btoa(encodeURIComponent(`01:Note:${id}`)))}
    >
      {props.children ?? id}
    </StyledChatMessageButton>
  );
};
