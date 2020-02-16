import React, { useEffect } from "react";
import ReactMde, { commands as ReactMdeCommands } from "react-mde";
import { useOvermind } from "../../hooks/use-overmind";
import styled from "@emotion/styled/macro";

import { Modal } from "../modal";
import * as Button from "../../button";
import * as Icons from "../../feather-icons";
import * as ScrollableList from "../components/scrollable-list";
import { CreateNewNoteDialogModal } from "./create-new-note-dialog-modal";
import { DeleteNoteConfirmationDialogModal } from "./delete-note-confirmation-dialog-modal";

const ReactMdeStyled = styled(ReactMde)`
  display: flex;
  flex-direction: column;
  height: 100%;
  border: none;

  .mde-textarea-wrapper {
    height: 100%;
  }
  .mde-header + div {
    height: 100%;
  }

  .grip {
    display: none;
  }

  textarea {
    outline: none;
  }
`;

const MARKDOWN_EDITOR_COMMANDS = [
  {
    commands: [
      ReactMdeCommands.boldCommand,
      ReactMdeCommands.italicCommand,
      ReactMdeCommands.strikeThroughCommand,
      ReactMdeCommands.orderedListCommand,
      ReactMdeCommands.unorderedListCommand,
      ReactMdeCommands.quoteCommand
    ]
  }
];

export const MarkdownEditor = ({ value, onChange }) => {
  return (
    <ReactMdeStyled
      commands={MARKDOWN_EDITOR_COMMANDS}
      value={value}
      onChange={onChange}
      minEditorHeight="100%"
      disablePreview
    />
  );
};

export const NoteEditor = ({ onClose }) => {
  const { state, actions } = useOvermind();
  useEffect(() => {
    actions.noteEditor.loadNotes();
  }, [actions]);

  // @TODO add a fance loading indicator
  if (!state.noteEditor.notes.length) return null;

  let activeModalComponent = null;
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
          onKeyDown={ev => {
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
                tabIndex="3"
                style={{ marginLeft: 8 }}
                onClick={onClose}
              >
                Close
              </Button.Tertiary>
            </div>
          </Modal.Header>
          <Modal.Body style={{ display: "flex", height: "80vh" }} noPadding>
            <Modal.Aside>
              <ScrollableList.List style={{ marginTop: 0 }}>
                {state.noteEditor.notes.map(note => (
                  <ScrollableList.ListItem key={note.id}>
                    <ScrollableList.ListItemButton
                      tabIndex="1"
                      isActive={note.id === state.noteEditor.activeNoteId}
                      onClick={() => {
                        actions.noteEditor.setActiveNoteId(note.id);
                      }}
                    >
                      {note.title}
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
              {state.noteEditor.activeNote ? (
                <>
                  <MarkdownEditor
                    value={state.noteEditor.activeNote.content}
                    onChange={actions.noteEditor.updateActiveNoteContent}
                  />
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
                </>
              ) : null}
            </Modal.Content>
          </Modal.Body>
        </Modal.Dialog>
      </Modal>
      {activeModalComponent}
    </>
  );
};
