import * as React from "react";
import { useNoteWindowActions } from "../token-info-aside";
import { useWindowContext } from "../token-info-aside/token-info-aside";
import styled from "@emotion/styled/macro";
import { lighten } from "polished";

const LINK_COLOR = "#044e54";
const LINK_COLOR_HOVER = lighten(0.1, LINK_COLOR);

const StyledNoteLink = styled.button`
  all: unset;
  cursor: pointer;
  color: #044e54;
  text-decoration: underline;
  &:hover {
    color: ${LINK_COLOR_HOVER};
  }
`;

export const NoteLink: React.FC<{ id?: string }> = (props) => {
  const windowId = useWindowContext();
  const noteWindowActions = useNoteWindowActions();
  const id = props.id ?? null;

  const noteId = React.useMemo(() => {
    if (!id) return null;
    // TODO: We should not do the encoding on the frontend 🤔
    return btoa(encodeURIComponent(`01:Note:${id}`));
  }, [id]);

  if (noteId === null) {
    return <>{props.children ?? null}</>;
  }

  return (
    <StyledNoteLink
      onClick={(ev) => {
        if (ev.ctrlKey || ev.metaKey) {
          noteWindowActions.showNoteInNewWindow(noteId);
        } else {
          noteWindowActions.showNoteInWindow(noteId, windowId);
        }
      }}
    >
      {props.children ?? id}
    </StyledNoteLink>
  );
};
