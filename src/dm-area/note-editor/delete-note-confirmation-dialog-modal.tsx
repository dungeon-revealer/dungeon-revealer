import React from "react";
import { Modal, ModalDialogSize } from "../../modal";
import * as Button from "../../button";

export const DeleteNoteConfirmationDialogModal: React.FC<{
  close: () => void;
  confirm: () => void;
}> = ({ close, confirm }) => {
  return (
    <Modal onClickOutside={close} onPressEscape={close}>
      <Modal.Dialog size={ModalDialogSize.SMALL}>
        <Modal.Header>
          <Modal.Heading3>Delete Note</Modal.Heading3>
        </Modal.Header>
        <Modal.Body>Do you really want to delete this note?</Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <Button.Tertiary type="submit" onClick={close}>
                Abort
              </Button.Tertiary>
              <Button.Primary
                type="button"
                onClick={() => {
                  close();
                  confirm();
                }}
              >
                Delete
              </Button.Primary>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};
