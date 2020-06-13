import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { useMutation } from "react-relay/hooks";
import { Modal, ModalDialogSize } from "../../modal";
import * as Button from "../../button";
import { InputGroup } from "../../input";
import { createNewNoteDialogModal_NoteCreateMutation } from "./__generated__/createNewNoteDialogModal_NoteCreateMutation.graphql";
import { ConnectionHandler } from "relay-runtime";

const CreateNewNoteDialogModalNoteCreateMutation = graphql`
  mutation createNewNoteDialogModal_NoteCreateMutation(
    $input: NoteCreateInput!
  ) {
    noteCreate(input: $input) {
      note {
        id
        title
        content
      }
    }
  }
`;

export const CreateNewNoteDialogModal: React.FC<{
  close: () => void;
}> = ({ close }) => {
  const [inputValue, setInputValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const onChangeInputValue = React.useCallback(
    (ev) => {
      setInputValue(ev.target.value);
    },
    [setInputValue]
  );

  const [mutate] = useMutation<createNewNoteDialogModal_NoteCreateMutation>(
    CreateNewNoteDialogModalNoteCreateMutation
  );

  const submit = React.useCallback(() => {
    if (inputValue.trim().length === 0) {
      setError("Please enter a note name.");
      return;
    }
    mutate({
      variables: {
        input: {
          title: inputValue,
          content: "",
        },
      },
      updater: (store) => {
        const notesConnection = ConnectionHandler.getConnection(
          store.getRoot(),
          "noteEditorSideBar_notes"
        );
        const note = store.getRootField("noteCreate")?.getLinkedRecord("note");
        if (!notesConnection || !note) return;

        const edge = ConnectionHandler.createEdge(
          store,
          notesConnection,
          note,
          "Note"
        );
        ConnectionHandler.insertEdgeBefore(notesConnection, edge);
      },
    });
    close();
  }, [inputValue, mutate, setError, close]);

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
              <div>
                <Button.Tertiary type="button" onClick={close}>
                  Abort
                </Button.Tertiary>
              </div>
              <div>
                <Button.Primary type="submit">Create Note</Button.Primary>
              </div>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};
