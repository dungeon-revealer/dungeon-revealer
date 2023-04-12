import * as React from "react";

import { Modal, ModalDialogSize } from "../modal";
import * as Button from "../button";
import { Checkbox } from "@chakra-ui/react";
import { useGameSettings } from "../game-settings";

export const SettingsModal = (props: {
  close: () => void;
}): React.ReactElement => {
  let gameSettings = useGameSettings();

  const changeAutoPush = (event: React.ChangeEvent<HTMLInputElement>) => {
    gameSettings.setValue(
      Object.assign(gameSettings.value, {
        autoSendMapUpdates: event.target.checked,
      })
    );
  };

  const changeDMFollow = (event: React.ChangeEvent<HTMLInputElement>) => {
    gameSettings.setValue(
      Object.assign(gameSettings.value, {
        clientsFollowDM: event.target.checked,
      })
    );
  };

  return (
    <Modal onPressEscape={props.close} onClickOutside={props.close}>
      <Modal.Dialog size={ModalDialogSize.SMALL}>
        <Modal.Header>
          <h3>Game Settings</h3>
        </Modal.Header>
        <Modal.Body>
          <Checkbox
            isChecked={gameSettings.value.autoSendMapUpdates}
            onChange={changeAutoPush}
          >
            Automatically push fog updates to clients
          </Checkbox>
          <Checkbox
            isChecked={gameSettings.value.clientsFollowDM}
            onChange={changeDMFollow}
          >
            Set clients to follow any screen movements the DM makes.
          </Checkbox>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <Button.Tertiary tabIndex={1} onClick={props.close}>
                Close
              </Button.Tertiary>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};
