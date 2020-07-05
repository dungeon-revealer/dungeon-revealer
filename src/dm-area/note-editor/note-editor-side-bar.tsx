import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { usePagination, ConnectionConfig } from "relay-hooks";
import type { noteEditorSideBar_notesFragment$key } from "./__generated__/noteEditorSideBar_notesFragment.graphql";
import * as ScrollableList from "../components/scrollable-list";

const NoteEditorSideBar_notesFragment = graphql`
  fragment noteEditorSideBar_notesFragment on Query
    @argumentDefinitions(
      count: { type: "Int", defaultValue: 20 }
      cursor: { type: "String" }
    ) {
    notes(first: $count, after: $cursor)
      @connection(key: "noteEditorSideBar_notes", filters: []) {
      edges {
        node {
          id
          documentId
          title
        }
      }
    }
  }
`;

const connectionConfig: ConnectionConfig = {
  getVariables(props, { count, cursor }) {
    return {
      count,
      cursor,
    };
  },
  query: graphql`
    query noteEditorSideBar_MoreQuery($count: Int!, $cursor: String) {
      ...noteEditorSideBar_notesFragment
        @arguments(count: $count, cursor: $cursor)
    }
  `,
};

export const NoteEditorSideBar: React.FC<{
  setActiveNoteId: (activeItemId: string) => void;
  activeNoteId: string | null;
  notesRef: noteEditorSideBar_notesFragment$key;
}> = ({ setActiveNoteId, activeNoteId, notesRef }) => {
  const [data, { isLoading, hasMore, loadMore }] = usePagination(
    NoteEditorSideBar_notesFragment,
    notesRef
  );

  const _loadMore = () => {
    if (!hasMore() || isLoading()) {
      return;
    }

    loadMore(connectionConfig, 10, console.error);
  };

  const elementRef = React.useRef<HTMLUListElement>(null);

  return (
    <ScrollableList.List
      ref={elementRef}
      style={{ marginTop: 0 }}
      onScroll={() => {
        if (elementRef.current) {
          const htmlElement = elementRef.current;
          if (
            htmlElement.offsetHeight + htmlElement.scrollTop >=
            0.95 * htmlElement.scrollHeight
          ) {
            _loadMore();
          }
        }
      }}
    >
      {data.notes.edges.map((edge) => (
        <ScrollableList.ListItem key={edge.node.id}>
          <ScrollableList.ListItemButton
            isActive={activeNoteId === edge.node.documentId}
            onClick={() => {
              setActiveNoteId(edge.node.documentId);
            }}
          >
            {edge.node.title || "<Untitled Note>"}
          </ScrollableList.ListItemButton>
        </ScrollableList.ListItem>
      ))}
    </ScrollableList.List>
  );
};
