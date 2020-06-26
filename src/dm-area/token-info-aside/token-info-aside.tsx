import React from "react";
import styled from "@emotion/styled/macro";
import graphql from "babel-plugin-relay/macro";
import { useNoteWindows, useNoteWindowActions } from ".";
import { NoteEditorActiveItem } from "../note-editor/note-editor-active-item";
import { useQuery, useMutation } from "relay-hooks";
import type {
  tokenInfoAside_nodeQuery,
  tokenInfoAside_nodeQueryResponse,
} from "./__generated__/tokenInfoAside_nodeQuery.graphql";
import { DraggableWindow } from "../../draggable-window";
import * as Icon from "../../feather-icons";
import * as Button from "../../button";
import { tokenInfoAside_shareNoteMutation } from "./__generated__/tokenInfoAside_shareNoteMutation.graphql";
import { useCurrent } from "../../hooks/use-current";

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

const extractNode = (
  input: tokenInfoAside_nodeQueryResponse | null | undefined
) => {
  if (!input?.node) return null;
  if (input.node.__typename !== "Note") return null;
  return input.node;
};

const WindowRenderer: React.FC<{
  windowId: string;
  noteId: string;
  close: () => void;
  focus: () => void;
  navigateNext: null | (() => void);
  navigateBack: null | (() => void);
}> = ({ windowId, noteId, close, focus, navigateNext, navigateBack }) => {
  const data = useQuery<tokenInfoAside_nodeQuery>(
    TokenInfoAside_nodeQuery,
    React.useMemo(() => ({ activeNoteId: noteId }), [noteId])
  );

  const isLoading = !data.props && !data.error;

  const [, node] = useCurrent(extractNode(data.props), isLoading, 300);

  const [isEditMode, setIsEditMode] = React.useState(false);
  const sideBarRef = React.useRef<HTMLDivElement>(null);

  const [mutate] = useMutation<tokenInfoAside_shareNoteMutation>(
    TokenInfoAside_shareResourceMutation
  );

  const canEditOptions = node?.viewerCanEdit
    ? [
        {
          onClick: () => setIsEditMode((isEditMode) => !isEditMode),
          title: isEditMode ? "Save" : "Edit",
          //TODO: Make types more strict
          Icon: isEditMode ? (Icon.SaveIcon as any) : (Icon.EditIcon as any),
        },
      ]
    : [];

  const options = [
    {
      onClick: () =>
        node
          ? mutate({ variables: { input: { contentId: node.id } } })
          : () => undefined,
      title: "Share",
      //TODO: Make types more strict
      Icon: Icon.Share as any,
    },
    ...canEditOptions,
  ];

  return (
    <WindowContext.Provider value={windowId}>
      <DraggableWindow
        onMouseDown={focus}
        onKeyDown={(ev) => {
          ev.stopPropagation();
          if (ev.key !== "Escape") return;
          if (!isEditMode) close();
        }}
        headerLeftContent={
          <>
            <Button.Tertiary
              small
              iconOnly
              onClick={navigateBack || undefined}
              disabled={!navigateBack}
              style={{ paddingLeft: 4, paddingRight: 4 }}
            >
              <Icon.ChevronLeftIcon height={16} />
            </Button.Tertiary>
            <Button.Tertiary
              small
              iconOnly
              onClick={navigateNext || undefined}
              disabled={!navigateNext}
              style={{ paddingLeft: 4, paddingRight: 4 }}
            >
              <Icon.ChevronRightIcon height={16} />
            </Button.Tertiary>
          </>
        }
        headerContent={node?.title}
        bodyContent={
          node ? (
            <>
              <NoteEditorActiveItem
                key={node.id}
                isEditMode={isEditMode}
                toggleIsEditMode={() =>
                  setIsEditMode((isEditMode) => !isEditMode)
                }
                nodeRef={node}
                sideBarRef={sideBarRef}
              />
              <NoteEditorSideReference>
                <div ref={sideBarRef} />
              </NoteEditorSideReference>
            </>
          ) : null
        }
        close={close}
        style={{
          top: window.innerHeight / 2 - window.innerHeight / 4,
          left: window.innerWidth / 2 - 500 / 2,
        }}
        options={options}
      />
    </WindowContext.Provider>
  );
};

export const TokenInfoAside: React.FC<{}> = () => {
  const noteWindowActions = useNoteWindowActions();
  const noteWindows = useNoteWindows();

  return (
    <>
      {noteWindows.windows.map((window) => (
        <WindowRenderer
          key={window.id}
          windowId={window.id}
          noteId={window.history[window.currentIndex]}
          navigateBack={
            window.currentIndex > 0
              ? () => noteWindowActions.navigateBack(window.id)
              : null
          }
          navigateNext={
            window.currentIndex < window.history.length - 1
              ? () => noteWindowActions.navigateNext(window.id)
              : null
          }
          close={() => noteWindowActions.destroyWindow(window.id)}
          focus={() => noteWindowActions.focusWindow(window.id)}
        />
      ))}
    </>
  );
};
