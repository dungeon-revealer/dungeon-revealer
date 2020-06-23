import React from "react";
import styled from "@emotion/styled/macro";
import graphql from "babel-plugin-relay/macro";
import { useNoteWindow } from ".";
import { NoteEditorActiveItem } from "../note-editor/note-editor-active-item";
import { QueryRenderer } from "react-relay";
import type { tokenInfoAside_nodeQuery } from "./__generated__/tokenInfoAside_nodeQuery.graphql";
import { useRelayEnvironment, useMutation } from "react-relay/hooks";
import { DraggableWindow } from "../../draggable-window";
import * as Icon from "../../feather-icons";
import { tokenInfoAside_shareNoteMutation } from "./__generated__/tokenInfoAside_shareNoteMutation.graphql";

const TokenInfoAside_nodeQuery = graphql`
  query tokenInfoAside_nodeQuery($activeNoteId: ID!) {
    node(id: $activeNoteId) {
      ... on Note {
        __typename
        id
        title
        viewerCanEdit
        ...noteEditorActiveItem_nodeFragment
      }
    }
  }
`;

const TokenInfoAside_shareResourceMutation = graphql`
  mutation tokenInfoAside_shareNoteMutation($input: ShareResourceInput!) {
    shareResource(input: $input)
  }
`;

const NoteEditorSideReference = styled.div`
  position: absolute;
  right: calc(100% + 12px);
  top: 25%;
  width: 300px;
  background: white;
  border-left: 1px solid lightgrey;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
`;

const WindowContext = React.createContext("NON_EXISTING_WINDOW");
export const useWindowContext = () => React.useContext(WindowContext);

const WindowRenderer: React.FC<{
  windowId: string;
  noteId: string;
  close: () => void;
  focus: () => void;
}> = ({ windowId, noteId: activeNoteId, close, focus }) => {
  const environment = useRelayEnvironment();

  const [isEditMode, setIsEditMode] = React.useState(false);
  const sideBarRef = React.useRef<HTMLDivElement>(null);

  const [mutate] = useMutation<tokenInfoAside_shareNoteMutation>(
    TokenInfoAside_shareResourceMutation
  );

  if (!activeNoteId) return null;

  return (
    <WindowContext.Provider value={windowId}>
      <QueryRenderer<tokenInfoAside_nodeQuery>
        environment={environment}
        variables={{ activeNoteId: activeNoteId }}
        query={TokenInfoAside_nodeQuery}
        render={({ error, props }) => {
          if (error) return null;
          if (props?.node?.__typename !== "Note") return null;
          const { node } = props;

          const canEditOptions = props.node.viewerCanEdit
            ? [
                {
                  onClick: () => setIsEditMode((isEditMode) => !isEditMode),
                  title: isEditMode ? "Save" : "Edit",
                  //TODO: Make types more strict
                  Icon: isEditMode
                    ? (Icon.SaveIcon as any)
                    : (Icon.EditIcon as any),
                },
              ]
            : [];

          const options = [
            {
              onClick: () =>
                mutate({ variables: { input: { contentId: node.id } } }),
              title: "Share",
              //TODO: Make types more strict
              Icon: Icon.Share as any,
            },
            ...canEditOptions,
          ];

          return (
            <DraggableWindow
              onMouseDown={focus}
              onKeyDown={(ev) => {
                ev.stopPropagation();
                if (ev.key !== "Escape") return;
                if (!isEditMode) close();
              }}
              headerContent={props.node.title}
              bodyContent={
                <>
                  <NoteEditorActiveItem
                    isEditMode={isEditMode}
                    toggleIsEditMode={() =>
                      setIsEditMode((isEditMode) => !isEditMode)
                    }
                    nodeRef={props.node}
                    sideBarRef={sideBarRef}
                  />
                  <NoteEditorSideReference>
                    <div ref={sideBarRef} />
                  </NoteEditorSideReference>
                </>
              }
              close={close}
              style={{
                top: "calc(50vh - 25%)",
                left: "calc(100% - 500px - 12px)",
              }}
              options={options}
            />
          );
        }}
      />
    </WindowContext.Provider>
  );
};

export const TokenInfoAside: React.FC<{}> = () => {
  const state = useNoteWindow();

  return (
    <>
      {state.windows.map((window) => (
        <WindowRenderer
          key={window.id}
          windowId={window.id}
          noteId={window.noteId}
          close={() => state.destroyWindow(window.id)}
          focus={() => state.focusOrShowNoteInNewWindow(window.noteId)}
        />
      ))}
    </>
  );
};
