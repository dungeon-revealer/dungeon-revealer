import React from "react";
import { Modal } from "../dm-area/modal";
import * as Button from "../button";

export const SelectTokenMarkerReferenceModal = ({ close, onConfirm }) => {
  return (
    <Modal onPressEscape={close} onClickOutside={close}>
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
            <Button.Tertiary onClick={close}>Abort</Button.Tertiary>
            <Button.Primary tabIndex="1" onClick={() => onConfirm("NEW_NOTE")}>
              Create new Note
            </Button.Primary>
          </Modal.ActionGroup>
        </Modal.Actions>
      </Modal.Dialog>
    </Modal>
  );
};
