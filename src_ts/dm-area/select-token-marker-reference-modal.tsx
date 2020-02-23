import React from "react";
import { Modal } from "./modal";
import * as Button from "../button";
import styled from "@emotion/styled/macro";

const OrSeperator = styled.span`
  padding-left: 18px;
  font-weight: bold;
`;

export const SelectTokenMarkerReferenceModal: React.FC<{
  close: () => void;
  onConfirm: (type: "NEW_NOTE" | "EXISTING_NOTE") => void;
}> = ({ close, onConfirm }) => {
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
            <Button.Primary tabIndex={1} onClick={() => onConfirm("NEW_NOTE")}>
              Create new Note
            </Button.Primary>
            <OrSeperator>or</OrSeperator>
            <Button.Primary
              tabIndex={1}
              onClick={() => onConfirm("EXISTING_NOTE")}
            >
              Link existing Note
            </Button.Primary>
          </Modal.ActionGroup>
        </Modal.Actions>
      </Modal.Dialog>
    </Modal>
  );
};
