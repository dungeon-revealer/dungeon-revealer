import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { useFragment } from "react-relay/hooks";
import type { noteEditorSideBar_notesFragment$key } from "./__generated__/noteEditorSideBar_notesFragment.graphql";
import { Modal } from "../../modal";
import * as Button from "../../button";
import * as Icons from "../../feather-icons";
import * as ScrollableList from "../components/scrollable-list";
import { CreateNewNoteDialogModal } from "./create-new-note-dialog-modal";

const NoteEditorSideBar_notesFragment = graphql`
  fragment noteEditorSideBar_notesFragment on Query {
    notes(first: 10) @connection(key: "noteEditorSideBar_notes", filters: []) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
`;

export const NoteEditorSideBar: React.FC<{
  setActiveNoteId: (activeItemId: string) => void;
  activeNoteId: string | null;
  notesRef: noteEditorSideBar_notesFragment$key;
}> = ({ setActiveNoteId, activeNoteId, notesRef }) => {
  const [activeModal, setActiveModal] = React.useState<React.ReactNode>(null);
  const data = useFragment(NoteEditorSideBar_notesFragment, notesRef);

  return (
    <Modal.Aside>
      <ScrollableList.List style={{ marginTop: 0 }}>
        {data.notes.edges.map((edge) => (
          <ScrollableList.ListItem key={edge.node.id}>
            <ScrollableList.ListItemButton
              isActive={activeNoteId === edge.node.id}
              onClick={() => {
                setActiveNoteId(edge.node.id);
              }}
            >
              {edge.node.title || "<Untitled Note>"}
            </ScrollableList.ListItemButton>
          </ScrollableList.ListItem>
        ))}
      </ScrollableList.List>
      <Modal.Footer>
        <Button.Primary
          onClick={() =>
            setActiveModal(
              <CreateNewNoteDialogModal close={() => setActiveModal(null)} />
            )
          }
          fullWidth
        >
          <Icons.PlusIcon height={20} width={20} /> <span>Create New Note</span>
        </Button.Primary>
      </Modal.Footer>
      {activeModal}
    </Modal.Aside>
  );
};
