import React from "react";
import graphql from "babel-plugin-relay/macro";
import { useMutation, useRelayEnvironment, useQuery } from "relay-hooks";
import { ConnectionHandler } from "relay-runtime";

import { noteEditor_NoteDeleteMutation } from "./__generated__/noteEditor_NoteDeleteMutation.graphql";
import { noteEditor_NoteCreateMutation } from "./__generated__/noteEditor_NoteCreateMutation.graphql";

import { noteEditor_SideBarQuery } from "./__generated__/noteEditor_SideBarQuery.graphql";
import { noteEditor_ActiveItemQuery } from "./__generated__/noteEditor_ActiveItemQuery.graphql";

import { Modal } from "../../modal";
import * as Button from "../../button";
import * as Icons from "../../feather-icons";
import { NoteEditorSideBar } from "./note-editor-side-bar";
import { NoteEditorActiveItem } from "./note-editor-active-item";
import { useConfirmationDialog } from "../../hooks/use-confirmation-dialog";
import styled from "@emotion/styled/macro";
import { QueryRenderer } from "react-relay";
import { useNoteTitleAutoSave } from "../../hooks/use-note-title-auto-save";

const NoteEditor_NoteDeleteMutation = graphql`
  mutation noteEditor_NoteDeleteMutation($input: NoteDeleteInput!) {
    noteDelete(input: $input) {
      success
      deletedNoteId
    }
  }
`;

const NoteEditor_NoteCreateMutation = graphql`
  mutation noteEditor_NoteCreateMutation($input: NoteCreateInput!) {
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

const NoteEditor_ActiveItemQuery = graphql`
  query noteEditor_ActiveItemQuery($documentId: ID!) {
    note(documentId: $documentId) {
      id
      title
      ...noteEditorActiveItem_nodeFragment
    }
  }
`;

const NoteEditor_SideBarQuery = graphql`
  query noteEditor_SideBarQuery {
    ...noteEditorSideBar_notesFragment
  }
`;

const TitleAutoSaveInput: React.FC<{ id: string; title: string }> = (props) => {
  const [title, setTitle] = useNoteTitleAutoSave(props.id, props.title);
  return (
    <label
      style={{
        display: "block",
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 10,
      }}
    >
      <strong style={{ paddingBottom: 10, display: "block" }}>Title: </strong>
      <input
        value={title}
        style={{ width: "100%" }}
        onChange={(ev) => setTitle(ev.target.value)}
      />
    </label>
  );
};

export const NoteEditor: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const environment = useRelayEnvironment();
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [activeNoteId, setActiveNoteId] = React.useState<{
    id: string;
    documentId: string;
  } | null>(null);
  const [confirmationDialog, showConfirmationDialog] = useConfirmationDialog();

  const [deleteNoteMutation] = useMutation<noteEditor_NoteDeleteMutation>(
    NoteEditor_NoteDeleteMutation
  );
  const [createNoteMutation] = useMutation<noteEditor_NoteCreateMutation>(
    NoteEditor_NoteCreateMutation
  );

  const sideBarData = useQuery<noteEditor_SideBarQuery>(
    NoteEditor_SideBarQuery,
    {}
  );
  const sideBarRefetchRef = React.useRef<null | (() => void)>(null);

  const sideBarRef = React.useRef<HTMLDivElement>(null);

  if (!sideBarData?.props) return null;

  return (
    <Modal onClickOutside={onClose} onPressEscape={onClose}>
      <Modal.Dialog
        onKeyDown={(ev) => {
          if (ev.key === "Escape" && isEditMode) {
            ev.stopPropagation();
          }
        }}
      >
        <Modal.Header>
          <Modal.Heading2>
            <Icons.BookOpen
              width={28}
              height={28}
              style={{ marginBottom: -2, marginRight: 16 }}
            />{" "}
            Notes
          </Modal.Heading2>
          <div style={{ flex: 1, textAlign: "right" }}>
            <Button.Tertiary
              tabIndex={3}
              style={{ marginLeft: 8 }}
              onClick={onClose}
            >
              Close
            </Button.Tertiary>
          </div>
        </Modal.Header>
        <Modal.Body style={{ display: "flex", height: "80vh" }} noPadding>
          <Modal.Aside>
            <NoteEditorSideBar
              notesRef={sideBarData.props}
              setActiveNoteId={setActiveNoteId}
              activeNoteId={activeNoteId}
              sideBarRefetchRef={sideBarRefetchRef}
            />
            <Modal.Footer>
              <Button.Primary
                onClick={() =>
                  createNoteMutation({
                    variables: {
                      input: {
                        title: "<Untitled Note>",
                        content: "",
                        isEntryPoint: true,
                      },
                    },
                    updater: (store) => {
                      const notesConnection = ConnectionHandler.getConnection(
                        store.getRoot(),
                        "noteEditorSideBar_notes"
                      );
                      const note = store
                        .getRootField("noteCreate")
                        ?.getLinkedRecord("note");
                      if (!notesConnection || !note) return;

                      const edge = ConnectionHandler.createEdge(
                        store,
                        notesConnection,
                        note,
                        "Note"
                      );
                      ConnectionHandler.insertEdgeBefore(notesConnection, edge);
                    },
                    onCompleted: (data) => {
                      setActiveNoteId({
                        id: data.noteCreate.note.id,
                        documentId: data.noteCreate.note.documentId,
                      });
                      setIsEditMode(true);
                    },
                  })
                }
                fullWidth
              >
                <Icons.PlusIcon height={20} width={20} />
                <span>Create New Note</span>
              </Button.Primary>
            </Modal.Footer>
          </Modal.Aside>
          <Modal.Content style={{ position: "relative" }}>
            {activeNoteId ? (
              <QueryRenderer<noteEditor_ActiveItemQuery>
                environment={environment}
                query={NoteEditor_ActiveItemQuery}
                variables={{ documentId: activeNoteId.documentId }}
                render={({ error, props }) => {
                  if (error) return null;
                  if (!props?.note) return null;

                  return (
                    <>
                      {isEditMode ? (
                        <TitleAutoSaveInput
                          id={props.note.id}
                          title={props.note.title}
                        />
                      ) : null}
                      <NoteEditorActiveItem
                        key={props.note.id}
                        isEditMode={isEditMode}
                        toggleIsEditMode={() =>
                          setIsEditMode((isEditMode) => !isEditMode)
                        }
                        nodeRef={props.note}
                        sideBarRef={sideBarRef}
                      />
                      <Modal.Footer>
                        <Modal.Actions>
                          <Modal.ActionGroup>
                            <Button.Tertiary
                              onClick={() => {
                                showConfirmationDialog({
                                  header: "Delete Note",
                                  body:
                                    "Do you really want to delete this note?",
                                  cancelButtonText: "Abort",
                                  confirmButtonText: "Delete",
                                  onConfirm: () => {
                                    if (!activeNoteId) return;
                                    setActiveNoteId(null);
                                    deleteNoteMutation({
                                      variables: {
                                        input: { noteId: activeNoteId.id },
                                      },
                                      onCompleted: () => {
                                        sideBarRefetchRef.current?.();
                                      },
                                      configs: [
                                        {
                                          type: "RANGE_DELETE",
                                          parentID: "client:root",
                                          parentName: "client:root",
                                          connectionKeys: [
                                            {
                                              key: "noteEditorSideBar_notes",
                                            },
                                          ],
                                          pathToConnection: [
                                            "client:root",
                                            "notes",
                                          ],
                                          deletedIDFieldName: "deletedNoteId",
                                        },
                                      ],
                                    });
                                  },
                                });
                              }}
                            >
                              <Icons.TrashIcon height={20} width={20} />
                              <span>Delete Note</span>
                            </Button.Tertiary>
                            {isEditMode ? (
                              <Button.Primary
                                onClick={() => setIsEditMode(false)}
                              >
                                <Icons.SaveIcon height={20} width={20} />
                                <span>Save</span>
                              </Button.Primary>
                            ) : (
                              <Button.Primary
                                onClick={() => setIsEditMode(true)}
                              >
                                <Icons.EditIcon height={20} width={20} />
                                <span>Edit</span>
                              </Button.Primary>
                            )}
                          </Modal.ActionGroup>
                        </Modal.Actions>
                      </Modal.Footer>
                      <NoteEditorSideReference ref={sideBarRef} />
                    </>
                  );
                }}
              />
            ) : (
              <EmptyContainer>
                <Icons.Inbox height={75} width={75} fill="#D9E2EC" />
                <h3>Please select a Note from the list on the left.</h3>
              </EmptyContainer>
            )}
          </Modal.Content>
        </Modal.Body>
      </Modal.Dialog>
      {confirmationDialog}
    </Modal>
  );
};

const EmptyContainer = styled.div`
  display: flex;
  height: 100%;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  width: 100%;
`;

const NoteEditorSideReference = styled.div`
  position: absolute;
  left: calc(100% + 12px);
  top: 0;
  width: 300px;
  background: white;
  border-left: 1px solid lightgrey;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
`;
