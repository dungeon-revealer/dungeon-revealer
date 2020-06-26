import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { useFragment } from "relay-hooks";
import type { noteEditorSideBar_notesFragment$key } from "./__generated__/noteEditorSideBar_notesFragment.graphql";
import * as ScrollableList from "../components/scrollable-list";

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
  const data = useFragment(NoteEditorSideBar_notesFragment, notesRef);

  return (
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
  );
};
