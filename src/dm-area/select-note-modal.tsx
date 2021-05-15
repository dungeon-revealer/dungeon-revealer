import * as React from "react";
import { Modal } from "../modal";
import * as Button from "../button";
import styled from "@emotion/styled/macro";
import { HtmlContainer } from "./components/html-container";
import graphql from "babel-plugin-relay/macro";
import { useMutation, useQuery } from "relay-hooks";
import { selectNoteModal_NotesQuery } from "./__generated__/selectNoteModal_NotesQuery.graphql";
import { selectNoteModal_ActiveContentQuery } from "./__generated__/selectNoteModal_ActiveContentQuery.graphql";
import { NoteEditorSideBar } from "./note-editor/note-editor-side-bar";
import { selectNoteModal_NoteCreateMutation } from "./__generated__/selectNoteModal_NoteCreateMutation.graphql";

const SelectNoteModal_ReferenceQuery = graphql`
  query selectNoteModal_NotesQuery {
    ...noteEditorSideBar_notesFragment
  }
`;

const SelectNoteModal_ActiveContentQuery = graphql`
  query selectNoteModal_ActiveContentQuery($documentId: ID!) {
    note(documentId: $documentId) {
      id
      documentId
      content
    }
  }
`;

const NoteCreateMutation = graphql`
  mutation selectNoteModal_NoteCreateMutation($input: NoteCreateInput!) {
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

export const useShowSelectNoteModal = () => {
  const [modalNode, setModalNode] = React.useState<React.ReactNode>(null);
  const close = () => setModalNode(null);

  return [
    modalNode,
    React.useCallback((onSelectNote: (noteId: string) => void) => {
      setModalNode(
        <SelectNoteModal
          onSelectNote={(documentId) => {
            close();
            onSelectNote(documentId);
          }}
          onClose={close}
        />
      );
    }, []),
  ] as const;
};

const ActiveNoteRenderer = (props: {
  activeNoteId: string;
  activeNoteDocumentId: string;
}): React.ReactElement | null => {
  const query = useQuery<selectNoteModal_ActiveContentQuery>(
    SelectNoteModal_ActiveContentQuery,
    { documentId: props.activeNoteDocumentId }
  );

  if (query.error || !query?.data?.note) {
    return null;
  }
  return (
    <div
      style={{
        paddingLeft: 16,
        paddingRight: 16,
        overflowY: "scroll",
      }}
    >
      <HtmlContainer markdown={query.data.note.content} />
    </div>
  );
};

export const SelectNoteModal: React.FC<{
  onSelectNote: (documentId: string) => void;
  onClose: () => void;
}> = (props) => {
  const sideBarData = useQuery<selectNoteModal_NotesQuery>(
    SelectNoteModal_ReferenceQuery,
    {}
  );
  const [activeNoteId, setActiveNoteId] =
    React.useState<{
      id: string;
      documentId: string;
    } | null>(null);
  const [mutate] =
    useMutation<selectNoteModal_NoteCreateMutation>(NoteCreateMutation);

  const attachNewNote = React.useCallback(() => {
    mutate({
      variables: {
        input: {
          title: "New Note",
          content: "",
          isEntryPoint: false,
        },
      },
      onCompleted: (data) => {
        props.onSelectNote(data.noteCreate.note.documentId);
      },
    });
  }, [mutate]);

  const attachExistingNote = React.useCallback(() => {
    if (!activeNoteId) return;
    props.onSelectNote(activeNoteId.documentId);
  }, [activeNoteId]);

  if (!sideBarData?.data) return null;

  return (
    <Modal onPressEscape={props.onClose} onClickOutside={props.onClose}>
      <Modal.Dialog>
        <Modal.Header>
          <Modal.Heading3>Attach Note</Modal.Heading3>
        </Modal.Header>
        <Modal.Body style={{ display: "flex", height: "70vh" }} noPadding>
          <Modal.Aside>
            <NoteEditorSideBar
              notesRef={sideBarData.data}
              setActiveNoteId={setActiveNoteId}
              activeNoteId={activeNoteId}
            />
          </Modal.Aside>
          <Modal.Content>
            {activeNoteId ? (
              <ActiveNoteRenderer
                activeNoteId={activeNoteId.id}
                activeNoteDocumentId={activeNoteId.documentId}
              />
            ) : null}
          </Modal.Content>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <div>
                <Button.Tertiary onClick={props.onClose}>Abort</Button.Tertiary>
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
