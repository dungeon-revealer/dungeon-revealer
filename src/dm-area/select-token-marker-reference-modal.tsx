import React, { useCallback } from "react";
import { Modal } from "./modal";
import * as Button from "../button";
import styled from "@emotion/styled/macro";
import { useOvermind } from "../hooks/use-overmind";
import { useFetch } from "./fetch-context";

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
        "Content-Type": "application/json"
      }
    });
    const body = await response.json();

    const reference = {
      type: "note" as "note",
      id: body.data.note.id as string
    };

    await updateToken({ id: tokenId, reference });

    await actions.tokenInfoAside.toggleActiveToken({
      id: tokenId,
      reference
    });
    actions.tokenInfoAside.setEditMode(true);
    actions.selectTokenMarkerReferenceModal.close();
  }, [localFetch]);

  return (
    <Modal
      onPressEscape={actions.selectTokenMarkerReferenceModal.close}
      onClickOutside={actions.selectTokenMarkerReferenceModal.close}
    >
      <Modal.Dialog>
        <Modal.Header>
          <Modal.Heading3>Attach Note</Modal.Heading3>
        </Modal.Header>
        <Modal.Body>
          A attached note can help you quickly accessing information. You could
          add a description for a location or any other entity that is
          represented by a token.
        </Modal.Body>
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
            <Button.Primary tabIndex={1}>Link existing Note</Button.Primary>
          </Modal.ActionGroup>
        </Modal.Actions>
      </Modal.Dialog>
    </Modal>
  );
};
