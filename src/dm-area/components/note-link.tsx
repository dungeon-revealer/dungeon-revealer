import * as React from "react";
import { useNoteWindow } from "../token-info-aside";
import { StyledChatMessageButton } from "./chat-message-button";
import { useWindowContext } from "../token-info-aside/token-info-aside";

export const NoteLink: React.FC<{ id?: string }> = (props) => {
  const windowId = useWindowContext();
  const state = useNoteWindow();
  const id = props.id ?? null;

  if (id === null) {
    return <>{props.children ?? null}</>;
  }

  return (
    <StyledChatMessageButton
      // TODO: We should not do the encoding on the frontend 🤔
      onClick={() =>
        state.showNoteInWindow(
          btoa(encodeURIComponent(`01:Note:${id}`)),
          windowId
        )
      }
    >
      {props.children ?? id}
    </StyledChatMessageButton>
  );
};
