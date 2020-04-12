import React, { useEffect } from "react";
import { useOvermind } from "../../hooks/use-overmind";
import styled from "@emotion/styled/macro";

import { Modal } from "../modal";
import * as Button from "../../button";
import * as Icons from "../../feather-icons";
import * as ScrollableList from "../components/scrollable-list";
import { CreateNewNoteDialogModal } from "./create-new-note-dialog-modal";
import { DeleteNoteConfirmationDialogModal } from "./delete-note-confirmation-dialog-modal";
import { HtmlContainer } from "../components/html-container";
import { Input } from "../../input";
import { MarkdownEditor } from "../components/markdown-editor";

const Header = styled.div`
  white-space: nowrap;
  width: 100%;
  display: flex;
  align-items: center;
`;

const Heading = styled.h3`
  text-overflow: ellipsis;
  overflow: hidden;
  margin-right: 16px;
`;

export const NoteEditor: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, actions } = useOvermind();
  useEffect(() => {
    actions.noteEditor.loadNotes();
  }, [actions]);

  if (state.noteEditor.isLoading) return null;

  let activeModalComponent: null | React.ReactElement = null;
  // eslint-disable-next-line default-case
  switch (state.noteEditor.activeModal) {
    case "CREATE_NEW_NOTE":
      activeModalComponent = (
        <CreateNewNoteDialogModal
          close={() => actions.noteEditor.setActiveModal(null)}
          createNote={async ({ title }) => {
            actions.noteEditor.createNewNote({ title });
          }}
        />
      );
      break;
    case "DELETE_NOTE":
      activeModalComponent = (
        <DeleteNoteConfirmationDialogModal
          close={() => actions.noteEditor.setActiveModal(null)}
          confirm={async () => {
            actions.noteEditor.deleteActiveNote();
          }}
        />
      );
      break;
  }

  return (
    <>
      <Modal onClickOutside={onClose} onPressEscape={onClose}>
        <Modal.Dialog
          onKeyDown={(ev) => {
            ev.stopPropagation();
            if (ev.key !== "Escape") return;
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
            {state.noteEditor.notes.length === 0 ? (
              <>
                <EmptyContainer>
                  <Icons.Inbox height={75} width={75} fill="#D9E2EC" />
                  <h3 style={{ marginBottom: 20 }}>Your library seems empty</h3>
                  <Button.Primary
                    big
                    onClick={() =>
                      actions.noteEditor.setActiveModal("CREATE_NEW_NOTE")
                    }
                  >
                    <Icons.PlusIcon height={24} width={24} />
                    <span>Create your first note</span>
                  </Button.Primary>
                </EmptyContainer>
              </>
            ) : (
              <>
                <Modal.Aside>
                  <ScrollableList.List style={{ marginTop: 0 }}>
                    {state.noteEditor.notes.map((note) => (
                      <ScrollableList.ListItem key={note.id}>
                        <ScrollableList.ListItemButton
                          isActive={note === state.noteEditor.activeNote}
                          onClick={() => {
                            actions.noteEditor.setActiveNoteId(note.id);
                          }}
                        >
                          {note.title || "<Untitled Note>"}
                        </ScrollableList.ListItemButton>
                      </ScrollableList.ListItem>
                    ))}
                  </ScrollableList.List>
                  <Modal.Footer>
                    <Button.Primary
                      onClick={() =>
                        actions.noteEditor.setActiveModal("CREATE_NEW_NOTE")
                      }
                      fullWidth
                    >
                      <Icons.PlusIcon height={20} width={20} />{" "}
                      <span>Create New Note</span>
                    </Button.Primary>
                  </Modal.Footer>
                </Modal.Aside>
                <Modal.Content>
                  <ContentRendered
                    state={state.noteEditor}
                    actions={actions.noteEditor}
                  />
                  {state.noteEditor.activeNote ? (
                    <Modal.Footer>
                      <Button.Tertiary
                        onClick={() => {
                          actions.noteEditor.setActiveModal("DELETE_NOTE");
                        }}
                      >
                        <Icons.TrashIcon height={20} width={20} />
                        <span>Delete Note</span>
                      </Button.Tertiary>
                    </Modal.Footer>
                  ) : null}
                </Modal.Content>
              </>
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal>
      {activeModalComponent}
    </>
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

const ContentRendered: React.FC<{
  state: ReturnType<typeof useOvermind>["state"]["noteEditor"];
  actions: ReturnType<typeof useOvermind>["actions"]["noteEditor"];
}> = ({ state, actions }) => {
  useOvermind();

  if (!state.activeNote) {
    return (
      <EmptyContainer>
        <Icons.Inbox height={75} width={75} fill="#D9E2EC" />
        <h3>Please select a Note from the list on the left.</h3>
      </EmptyContainer>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 8,
          paddingBottom: 16,
        }}
      >
        {state.isEditMode ? (
          <>
            <Input
              autoFocus
              placeholder="Note title"
              value={state.activeNote.title}
              onChange={(ev) => actions.updateActiveNoteTitle(ev.target.value)}
            />
            <Button.Tertiary
              iconOnly
              onClick={() => {
                actions.toggleIsEditMode();
              }}
              style={{ marginLeft: 16 }}
            >
              <Icons.SaveIcon height={16} />
            </Button.Tertiary>
          </>
        ) : (
          <Header>
            <Heading>{state.activeNote.title || "<Untitled Note>"}</Heading>
            <div>
              <Button.Tertiary
                iconOnly
                onClick={() => {
                  actions.toggleIsEditMode();
                }}
              >
                <Icons.EditIcon height={16} />
              </Button.Tertiary>
            </div>
          </Header>
        )}
      </div>
      {state.isEditMode ? (
        <>
          <MarkdownEditor
            value={state.activeNote.content}
            onChange={actions.updateActiveNoteContent}
          />
        </>
      ) : (
        <div
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            flexGrow: 1,
            overflow: "scroll",
          }}
        >
          <HtmlContainer markdown={state.activeNote.content} />
        </div>
      )}
    </>
  );
};
