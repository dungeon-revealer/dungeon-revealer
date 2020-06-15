import React from "react";
import graphql from "babel-plugin-relay/macro";
import {
  useMutation,
  useLazyLoadQuery,
  useRelayEnvironment,
} from "react-relay/hooks";
import { noteEditor_NoteDeleteMutation } from "./__generated__/noteEditor_NoteDeleteMutation.graphql";
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

const NoteEditor_NoteDeleteMutation = graphql`
  mutation noteEditor_NoteDeleteMutation($input: NoteDeleteInput!) {
    noteDelete(input: $input) {
      success
      deletedNoteId
    }
  }
`;

const NoteEditor_ActiveItemQuery = graphql`
  query noteEditor_ActiveItemQuery($activeNoteId: ID!) {
    node(id: $activeNoteId) {
      ... on Note {
        __typename
        id
        ...noteEditorActiveItem_nodeFragment
      }
    }
  }
`;

const NoteEditor_SideBarQuery = graphql`
  query noteEditor_SideBarQuery {
    ...noteEditorSideBar_notesFragment
  }
`;

export const NoteEditor: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const environment = useRelayEnvironment();
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(null);

  const [confirmationDialog, showConfirmationDialog] = useConfirmationDialog();

  const [deleteNoteMutation] = useMutation<noteEditor_NoteDeleteMutation>(
    NoteEditor_NoteDeleteMutation
  );

  const sideBarData = useLazyLoadQuery<noteEditor_SideBarQuery>(
    NoteEditor_SideBarQuery,
    {}
  );

  const sideBarRef = React.useRef<HTMLDivElement>(null);

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
          <NoteEditorSideBar
            notesRef={sideBarData}
            setActiveNoteId={setActiveNoteId}
            activeNoteId={activeNoteId}
          />
          <Modal.Content>
            {activeNoteId ? (
              <QueryRenderer<noteEditor_ActiveItemQuery>
                environment={environment}
                query={NoteEditor_ActiveItemQuery}
                variables={{ activeNoteId }}
                render={({ error, props }) => {
                  if (error) return null;
                  if (props?.node?.__typename !== "Note") return null;

                  return (
                    <>
                      <NoteEditorActiveItem
                        key={props.node.id}
                        isEditMode={isEditMode}
                        toggleIsEditMode={() =>
                          setIsEditMode((isEditMode) => !isEditMode)
                        }
                        nodeRef={props.node}
                        sideBarRef={sideBarRef}
                      />
                      <Modal.Footer>
                        <Button.Tertiary
                          onClick={() => {
                            showConfirmationDialog({
                              header: "Delete Note",
                              body: "Do you really want to delete this note?",
                              cancelButtonText: "Abort",
                              confirmButtonText: "Delete",
                              onConfirm: () => {
                                if (!activeNoteId) return;
                                setActiveNoteId(null);
                                deleteNoteMutation({
                                  variables: {
                                    input: { noteId: activeNoteId },
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
                      </Modal.Footer>
                      <div ref={sideBarRef} />
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
