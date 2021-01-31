import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { usePagination, useQuery } from "relay-hooks";
import type { noteEditorSideBar_notesFragment$key } from "./__generated__/noteEditorSideBar_notesFragment.graphql";
import * as ScrollableList from "../components/scrollable-list";
import { Input } from "../../input";
import { useCurrent } from "../../hooks/use-current";
import { noteEditorSideBar_searchQuery } from "./__generated__/noteEditorSideBar_searchQuery.graphql";

const NoteEditorSideBar_notesFragment = graphql`
  fragment noteEditorSideBar_notesFragment on Query
  @argumentDefinitions(
    count: { type: "Int", defaultValue: 20 }
    cursor: { type: "String" }
  )
  @refetchable(queryName: "noteEditorSideBar_MoreNotesQuery") {
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

const NotesRenderer: React.FC<{
  notesRef: noteEditorSideBar_notesFragment$key;
  setActiveItem: (id: { id: string; documentId: string }) => void;
  activeItemId: { id: string; documentId: string } | null;
}> = (props) => {
  const { data, isLoading, hasNext, loadNext } = usePagination(
    NoteEditorSideBar_notesFragment,
    props.notesRef
  );

  const _loadMore = () => {
    if (!hasNext || isLoading) {
      return;
    }

    loadNext(10, {
      onComplete: (error: Error | null) => {
        console.log("Complete", error);
      },
    });
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
            isActive={props.activeItemId?.documentId === edge.node.documentId}
            onClick={() => {
              props.setActiveItem(edge.node);
            }}
          >
            {edge.node.title || "<Untitled Note>"}
          </ScrollableList.ListItemButton>
        </ScrollableList.ListItem>
      ))}
    </ScrollableList.List>
  );
};

const NoteEditorSideBar_SearchQuery = graphql`
  query noteEditorSideBar_searchQuery($query: String!) {
    notesSearch(first: 30, query: $query)
      @connection(key: "noteEditorSideBar_notesSearch", filters: ["query"]) {
      edges {
        node {
          noteId
          documentId
          title
        }
      }
    }
  }
`;

export const NoteEditorSideBar: React.FC<{
  setActiveNoteId: (activeItemId: { id: string; documentId: string }) => void;
  activeNoteId: { id: string; documentId: string } | null;
  notesRef: noteEditorSideBar_notesFragment$key;
  sideBarRefetchRef?: React.MutableRefObject<null | (() => void)>;
}> = (props) => {
  const [filter, setFilter] = React.useState("");

  const data = useQuery<noteEditorSideBar_searchQuery>(
    NoteEditorSideBar_SearchQuery,
    {
      query: filter,
    },
    {
      skip: filter === "",
    }
  );

  const [, cachedData] = useCurrent(data, !data.error && !data.data, 0);

  React.useEffect(() => {
    if (props.sideBarRefetchRef) {
      props.sideBarRefetchRef.current =
        filter !== "" ? () => data.retry({ force: true }) : () => undefined;
    }
  });

  return (
    <>
      <div
        style={{
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        <Input
          tabIndex={1}
          placeholder="Search"
          value={filter}
          onChange={(ev) => setFilter(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.keyCode === 27 && filter !== "") {
              ev.stopPropagation();
              setFilter("");
            }
          }}
        />
      </div>
      {filter !== "" && cachedData?.data ? (
        <ScrollableList.List>
          {cachedData.data.notesSearch.edges.map((edge) => (
            <ScrollableList.ListItem key={edge.node.documentId}>
              <ScrollableList.ListItemButton
                isActive={
                  props.activeNoteId?.documentId === edge.node.documentId
                }
                onClick={() => {
                  props.setActiveNoteId({
                    id: edge.node.noteId,
                    documentId: edge.node.documentId,
                  });
                }}
              >
                {edge.node.title || "<Untitled Note>"}
              </ScrollableList.ListItemButton>
            </ScrollableList.ListItem>
          ))}
        </ScrollableList.List>
      ) : (
        <NotesRenderer
          notesRef={props.notesRef}
          activeItemId={props.activeNoteId}
          setActiveItem={props.setActiveNoteId}
        />
      )}
    </>
  );
};
