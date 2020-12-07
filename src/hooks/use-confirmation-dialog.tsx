import * as React from "react";
import { Modal, ModalDialogSize } from "../modal";
import * as Button from "../button";

export const useConfirmationDialog = () => {
  const [reactNode, setReactNode] = React.useState<React.ReactNode>(null);

  return [
    reactNode,
    React.useCallback(
      ({
        header,
        body,
        onConfirm,
        confirmButtonText = "Confirm",
        cancelButtonText = "Abort",
      }: {
        header: React.ReactNode;
        body: React.ReactNode;
        onConfirm: () => void;
        cancelButtonText?: React.ReactNode;
        confirmButtonText?: React.ReactNode;
      }) => {
        const close = () => setReactNode(null);
        setReactNode(
          <Modal onClickOutside={close} onPressEscape={close}>
            <Modal.Dialog size={ModalDialogSize.SMALL}>
              <Modal.Header>
                <Modal.Heading3>{header}</Modal.Heading3>
              </Modal.Header>
              <Modal.Body>{body}</Modal.Body>
              <Modal.Footer>
                <Modal.Actions>
                  <Modal.ActionGroup>
                    <div>
                      <Button.Tertiary type="submit" onClick={close}>
                        {cancelButtonText}
                      </Button.Tertiary>
                    </div>
                    <div>
                      <Button.Primary
                        type="button"
                        onClick={() => {
                          close();
                          onConfirm();
                        }}
                      >
                        {confirmButtonText}
                      </Button.Primary>
                    </div>
                  </Modal.ActionGroup>
                </Modal.Actions>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal>
        );
      },
      []
    ),
  ] as const;
};
