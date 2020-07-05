import React, { useCallback } from "react";
import { Modal } from "../modal";
import * as Button from "../button";
import styled from "@emotion/styled/macro";
import { HtmlContainer } from "./components/html-container";
import graphql from "babel-plugin-relay/macro";
import { QueryRenderer } from "react-relay";
import { useRelayEnvironment, useMutation, useQuery } from "relay-hooks";
import { selectTokenMarkerReferenceModal_NotesQuery } from "./__generated__/selectTokenMarkerReferenceModal_NotesQuery.graphql";
import { selectTokenMarkerReferenceModal_ActiveContentQuery } from "./__generated__/selectTokenMarkerReferenceModal_ActiveContentQuery.graphql";
import { NoteEditorSideBar } from "./note-editor/note-editor-side-bar";
import { selectTokenMarkerReferenceModal_NoteCreateMutation } from "./__generated__/selectTokenMarkerReferenceModal_NoteCreateMutation.graphql";
import { useNoteWindowActions } from "./token-info-aside";

const SelectTokenMarkerReferenceQuery = graphql`
  query selectTokenMarkerReferenceModal_NotesQuery {
    ...noteEditorSideBar_notesFragment
  }
`;

const SelectTokenMarkerReference_ActiveContentQuery = graphql`
  query selectTokenMarkerReferenceModal_ActiveContentQuery($activeNoteId: ID!) {
    node(id: $activeNoteId) {
      ... on Note {
        __typename
        id
        content
      }
    }
  }
`;

const NoteCreateMutation = graphql`
  mutation selectTokenMarkerReferenceModal_NoteCreateMutation(
    $input: NoteCreateInput!
  ) {
    noteCreate(input: $input) {
      note {
        id
        documentId
        title
        content
      }
    }
  }
`;

const OrSeperator = styled.span`
  padding-left: 18px;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
`;

type UpdateTokenFunction = (
  token: {
    id: string;
  } & Partial<{ reference: { type: "note"; id: string } }>
) => Promise<void>;

export const useShowSelectTokenMarkerReferenceModal = () => {
  const [modalNode, setModalNode] = React.useState<React.ReactNode>(null);

  return [
    modalNode,
    React.useCallback((tokenId: string, updateToken: UpdateTokenFunction) => {
      setModalNode(
        <React.Suspense fallback={null}>
          <SelectTokenMarkerReferenceModal
            tokenId={tokenId}
            updateToken={updateToken}
            close={() => setModalNode(null)}
          />
        </React.Suspense>
      );
    }, []),
  ] as const;
};

export const SelectTokenMarkerReferenceModal: React.FC<{
  close: () => void;
  tokenId: string;
  updateToken: UpdateTokenFunction;
}> = ({ close, tokenId, updateToken }) => {
  const environment = useRelayEnvironment();
  const sideBarData = useQuery<selectTokenMarkerReferenceModal_NotesQuery>(
    SelectTokenMarkerReferenceQuery,
    {}
  );
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(null);
  const [mutate] = useMutation<
    selectTokenMarkerReferenceModal_NoteCreateMutation
  >(NoteCreateMutation);

  const noteWindowActions = useNoteWindowActions();

  const attachNewNote = useCallback(() => {
    mutate({
      variables: {
        input: {
          title: "New Note",
          content: "",
          isEntryPoint: false,
        },
      },
      onCompleted: (data) => {
        const reference = {
          type: "note" as "note",
          id: data.noteCreate.note.documentId,
        };

        updateToken({ id: tokenId, reference });
        noteWindowActions.focusOrShowNoteInNewWindow(
          data.noteCreate.note.documentId
        );
        close();
      },
    });
  }, [updateToken, tokenId, close, mutate]);

  const attachExistingNote = useCallback(() => {
    if (!activeNoteId) return;

    const reference = {
      type: "note" as "note",
      id: activeNoteId,
    };

    updateToken({ id: tokenId, reference });
    noteWindowActions.focusOrShowNoteInNewWindow(activeNoteId);

    close();
  }, [updateToken, activeNoteId]);

  if (!sideBarData.props) return null;

  return (
    <Modal onPressEscape={close} onClickOutside={close}>
      <Modal.Dialog>
        <Modal.Header>
          <Modal.Heading3>Attach Note</Modal.Heading3>
        </Modal.Header>
        <Modal.Body style={{ display: "flex", height: "70vh" }} noPadding>
          <Modal.Aside>
            <NoteEditorSideBar
              notesRef={sideBarData.props}
              setActiveNoteId={setActiveNoteId}
              activeNoteId={activeNoteId}
            />
          </Modal.Aside>
          <Modal.Content>
            {activeNoteId ? (
              <QueryRenderer<selectTokenMarkerReferenceModal_ActiveContentQuery>
                environment={environment}
                query={SelectTokenMarkerReference_ActiveContentQuery}
                variables={{ activeNoteId }}
                render={({ error, props }) => {
                  if (error) return null;
                  if (props?.node?.__typename !== "Note") return null;
                  return (
                    <div
                      style={{
                        paddingLeft: 16,
                        paddingRight: 16,
                        overflowY: "scroll",
                      }}
                    >
                      <HtmlContainer markdown={props.node.content} />
                    </div>
                  );
                }}
              />
            ) : null}
          </Modal.Content>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <div>
                <Button.Tertiary onClick={close}>Abort</Button.Tertiary>
              </div>
              <div>
                <Button.Primary tabIndex={1} onClick={attachNewNote}>
                  Create new Note
                </Button.Primary>
              </div>
              <OrSeperator>or</OrSeperator>
              <div>
                <Button.Primary
                  tabIndex={1}
                  onClick={attachExistingNote}
                  disabled={activeNoteId === null}
                >
                  Link Note
                </Button.Primary>
              </div>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};
