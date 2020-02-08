import React, { useMemo, useEffect } from "react";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import produce from "immer";
import createPersistedState from "use-persisted-state";

import { Converter } from "showdown";

import { Modal } from "../modal";
import * as Button from "../../button";
import * as Icons from "../../feather-icons";
import * as ScrollableList from "../components/scrollable-list";
import { CreateNewNoteDialogModal } from "./create-new-note-dialog-modal";
import { DeleteNoteConfirmationDialogModal } from "./delete-note-confirmation-dialog-modal";
import ReactMde from "react-mde";
import styled from "@emotion/styled/macro";
import { useResetState } from "../../hooks/use-reset-state";

const INITIAL_STATE = {
  loading: true,
  error: null,
  notes: null,
  activeModal: null
};

const useActiveNoteId = createPersistedState("dm.settings.notes.activeNoteId");

const stateReducer = (state, action) =>
  produce(state, state => {
    // eslint-disable-next-line default-case
    switch (action.type) {
      case "RECEIVE_RESPONSE": {
        state.loading = false;
        state.notes = action.body.data.notes;
        break;
      }
      case "SET_ACTIVE_MODAL": {
        state.activeModal = action.modal;
        break;
      }
      case "CREATE_NOTE_RESPONSE": {
        state.notes.push(action.body.data.note);
        break;
      }
      case "UPDATE_NOTE_RESPONSE": {
        const note = state.notes.find(
          note => note.id === action.body.data.note.id
        );
        if (!note) break;
        note.title = action.body.data.note.title;
        note.content = action.body.data.note.content;
        break;
      }
      case "DELETE_NOTE_RESPONSE": {
        const noteIndex = state.notes.findIndex(
          node => node.id === action.body.data.deletedNoteId
        );
        if (noteIndex === -1) break;
        state.notes.splice(noteIndex, 1);
        break;
      }
    }
  });

const ReactMdeStyled = styled(ReactMde)`
  display: flex;
  flex-direction: column;
  height: 100%;
  border: none;

  > .grip {
    display: none;
  }

  > textarea {
    outline: none;
  }
`;

const MarkdownEditor = ({ id, content, save }) => {
  const [currentContent, setCurrentContent] = useResetState(content, [content]);
  const [selectedTab, setSelectedTab] = React.useState("write");
  const prevPropsRef = React.useRef({ id, content });

  useEffect(() => {
    let timeout = null;

    if (id !== prevPropsRef.current.id) {
      // instantly safe previous item in case item changes
      save(prevPropsRef.current.id, prevPropsRef.current.content);
    } else if (currentContent !== prevPropsRef.current.content) {
      // queue save in case the content changes
      timeout = setTimeout(() => {
        save(prevPropsRef.current.id, prevPropsRef.current.content);
      }, 500);
    }

    // store previous props for comparison purposes
    prevPropsRef.current = {
      id,
      content: currentContent
    };

    return () => timeout && clearTimeout(timeout);
  }, [id, currentContent, save]);

  return (
    <ReactMdeStyled
      value={currentContent}
      onChange={setCurrentContent}
      selectedTab={selectedTab}
      onTabChange={setSelectedTab}
      minEditorHeight="100%"
      generateMarkdownPreview={() => {
        const converter = new Converter();
        const html = converter.makeHtml(content);
        return Promise.resolve(html);
      }}
    />
  );
};

export const NoteEditor = ({ onClose, localFetch }) => {
  const [{ loading, notes, activeModal }, dispatch] = React.useReducer(
    stateReducer,
    INITIAL_STATE
  );
  const [activeNoteId, setActiveNoteId] = useActiveNoteId();

  const activeNote = useMemo(
    () => (notes && notes.find(note => note.id === activeNoteId)) || null,
    [notes, activeNoteId]
  );

  useAsyncEffect(
    function*() {
      const response = yield localFetch("/notes");
      const body = yield response.json();
      dispatch({ type: "RECEIVE_RESPONSE", body });
    },
    [localFetch]
  );

  // @TODO add a fance loading indicator
  if (loading) return null;

  let activeModalComponent = null;
  // eslint-disable-next-line default-case
  switch (activeModal) {
    case "CREATE_NEW_NOTE":
      activeModalComponent = (
        <CreateNewNoteDialogModal
          close={() => dispatch({ action: "SET_ACTIVE_MODAL", modal: null })}
          createNote={async ({ title }) => {
            const response = await localFetch("/notes", {
              method: "POST",
              body: JSON.stringify({ title }),
              headers: {
                "Content-Type": "application/json"
              }
            });
            const body = await response.json();
            dispatch({ type: "CREATE_NOTE_RESPONSE", body });
            dispatch({ type: "SET_ACTIVE_MODAL", modal: null });
            setActiveNoteId(body.data.note.id);
          }}
        />
      );
      break;
    case "DELETE_NOTE":
      activeModalComponent = (
        <DeleteNoteConfirmationDialogModal
          close={() => dispatch({ type: "SET_ACTIVE_MODAL", modal: null })}
          confirm={async () => {
            const response = await localFetch(`/notes/${activeNoteId}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json"
              }
            });
            const body = await response.json();
            dispatch({ type: "DELETE_NOTE_RESPONSE", body });
          }}
        />
      );
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
                {notes.map(note => (
                  <ScrollableList.ListItem key={note.id}>
                    <ScrollableList.ListItemButton
                      tabIndex="1"
                      isActive={note.id === activeNoteId}
                      onClick={() => {
                        setActiveNoteId(note.id);
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
                    dispatch({
                      type: "SET_ACTIVE_MODAL",
                      modal: "CREATE_NEW_NOTE"
                    })
                  }
                  fullWidth
                >
                  <Icons.PlusIcon height={20} width={20} />{" "}
                  <span>Create New Note</span>
                </Button.Primary>
              </Modal.Footer>
            </Modal.Aside>
            <Modal.Content>
              {activeNote ? (
                <>
                  <MarkdownEditor
                    id={activeNote.id}
                    content={activeNote.content}
                    save={async (id, content) => {
                      const response = await localFetch(`/notes/${id}`, {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ content })
                      });
                      const body = await response.json();
                      dispatch({ type: "UPDATE_NOTE_RESPONSE", body });
                    }}
                  />
                  <Modal.Footer>
                    <Button.Tertiary
                      onClick={() => {
                        dispatch({
                          type: "SET_ACTIVE_MODAL",
                          modal: "DELETE_NOTE"
                        });
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
