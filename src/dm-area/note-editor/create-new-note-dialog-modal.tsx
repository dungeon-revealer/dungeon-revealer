import React, { useCallback, useState } from "react";
import { Modal, ModalDialogSize } from "../modal";
import * as Button from "../../button";
import { InputGroup } from "../../input";

export const CreateNewNoteDialogModal: React.FC<{
  close: () => void;
  createNote: (input: { title: string }) => void;
}> = ({ close, createNote }) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const onChangeInputValue = useCallback(
    (ev) => {
      setInputValue(ev.target.value);
    },
    [setInputValue]
  );
  const submit = useCallback(() => {
    if (inputValue.trim().length === 0) {
      setError("Please enter a note name.");
      return;
    }
    createNote({ title: inputValue });
    close();
  }, [inputValue, createNote, setError, close]);

  return (
    <Modal onClickOutside={close} onPressEscape={close}>
      <Modal.Dialog size={ModalDialogSize.SMALL} onSubmit={submit}>
        <Modal.Header>
          <Modal.Heading3>Create Note</Modal.Heading3>
        </Modal.Header>

        <Modal.Body>
          <InputGroup
            autoFocus
            placeholder="Note title"
            value={inputValue}
            onChange={onChangeInputValue}
            error={error}
          />
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <Button.Tertiary type="button" onClick={close}>
                Abort
              </Button.Tertiary>
              <Button.Primary type="submit">Create Note</Button.Primary>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};
