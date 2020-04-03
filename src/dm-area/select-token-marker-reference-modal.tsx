import React, { useCallback } from "react";
import { Converter as HtmlConverter } from "showdown";
import { Modal } from "./modal";
import * as Button from "../button";
import * as ScrollableList from "./components/scrollable-list";
import styled from "@emotion/styled/macro";
import { useOvermind } from "../hooks/use-overmind";
import { useFetch } from "./fetch-context";
import { HtmlContainer } from "./components/html-container";

const OrSeperator = styled.span`
  padding-left: 18px;
  font-weight: bold;
`;

export const SelectTokenMarkerReferenceModal: React.FC<{
  updateToken: (
    token: {
      id: string;
    } & Partial<{ reference: { type: "note"; id: string } }>
  ) => Promise<void>;
}> = ({ updateToken }) => {
  const { actions, state } = useOvermind();
  const localFetch = useFetch();

  const attachNewNote = useCallback(async () => {
    if (state.selectTokenMarkerReferenceModal.mode !== "ACTIVE") return;
    const tokenId = state.selectTokenMarkerReferenceModal.tokenId;

    const response = await localFetch(`/notes`, {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const body = await response.json();

    const reference = {
      type: "note" as "note",
      id: body.data.note.id as string,
    };

    await updateToken({ id: tokenId, reference });

    await actions.tokenInfoAside.toggleActiveToken({
      id: tokenId,
      reference,
    });
    actions.tokenInfoAside.setEditMode(true);
    actions.selectTokenMarkerReferenceModal.close();
  }, [localFetch, updateToken]);

  const attachExistingNote = useCallback(async () => {
    if (
      state.selectTokenMarkerReferenceModal.mode !== "ACTIVE" ||
      state.selectTokenMarkerReferenceModal.activeNoteId === null
    )
      return;
    const tokenId = state.selectTokenMarkerReferenceModal.tokenId;

    const reference = {
      type: "note" as "note",
      id: state.selectTokenMarkerReferenceModal.activeNoteId,
    };

    await updateToken({ id: tokenId, reference });
    await actions.tokenInfoAside.toggleActiveToken({
      id: tokenId,
      reference,
    });
    actions.selectTokenMarkerReferenceModal.close();
  }, [updateToken]);

  const isActiveNote = useCallback((note) => {
    if (state.selectTokenMarkerReferenceModal.mode !== "ACTIVE") return false;
    return note === state.selectTokenMarkerReferenceModal.activeNote;
  }, []);

  if (state.selectTokenMarkerReferenceModal.mode === "NONE") return null;

  return (
    <Modal
      onPressEscape={actions.selectTokenMarkerReferenceModal.close}
      onClickOutside={actions.selectTokenMarkerReferenceModal.close}
    >
      <Modal.Dialog>
        <Modal.Header>
          <Modal.Heading3>Attach Note</Modal.Heading3>
        </Modal.Header>
        <Modal.Body style={{ display: "flex", height: "70vh" }} noPadding>
          <Modal.Aside>
            <ScrollableList.List style={{ marginTop: 0 }}>
              {state.selectTokenMarkerReferenceModal.notes.map((note) => (
                <ScrollableList.ListItem key={note.id}>
                  <ScrollableList.ListItemButton
                    isActive={isActiveNote(note)}
                    onClick={() => {
                      actions.selectTokenMarkerReferenceModal.setActiveNote(
                        note
                      );
                    }}
                  >
                    {note.title || "<Untitled Note>"}
                  </ScrollableList.ListItemButton>
                </ScrollableList.ListItem>
              ))}
            </ScrollableList.List>
          </Modal.Aside>
          <Modal.Content>
            {state.selectTokenMarkerReferenceModal.activeNote ? (
              <div
                style={{
                  paddingLeft: 16,
                  paddingRight: 16,
                  overflowY: "scroll",
                }}
              >
                <HtmlContainer
                  dangerouslySetInnerHTML={{
                    __html: new HtmlConverter().makeHtml(
                      state.selectTokenMarkerReferenceModal.activeNote.content
                    ),
                  }}
                />
              </div>
            ) : (
              "NOPE"
            )}
          </Modal.Content>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <Button.Tertiary
                onClick={actions.selectTokenMarkerReferenceModal.close}
              >
                Abort
              </Button.Tertiary>
              <Button.Primary tabIndex={1} onClick={attachNewNote}>
                Create new Note
              </Button.Primary>
              <OrSeperator>or</OrSeperator>
              <Button.Primary tabIndex={1} onClick={attachExistingNote}>
                Link Note
              </Button.Primary>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};
