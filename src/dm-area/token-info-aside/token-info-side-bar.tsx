import * as React from "react";
import * as ScrollableList from "../components/scrollable-list";
import graphql from "babel-plugin-relay/macro";
import { usePagination, useQuery, useSubscription } from "relay-hooks";
import { ConnectionHandler } from "relay-runtime";
import {
  Input,
  Box,
  InputLeftElement,
  InputGroup,
  InputRightElement,
  Button,
  FormControl,
  FormLabel,
  Switch,
} from "@chakra-ui/react";
import * as Icon from "../../feather-icons";
import { useCurrent } from "../../hooks/use-current";
import { tokenInfoSideBar_NotesFragment$key } from "./__generated__/tokenInfoSideBar_NotesFragment.graphql";
import { tokenInfoSideBar_NotesQuery } from "./__generated__/tokenInfoSideBar_NotesQuery.graphql";
import { useNoteWindowActions } from ".";
import { tokenInfoSideBar_SearchQuery } from "./__generated__/tokenInfoSideBar_SearchQuery.graphql";
import { tokenInfoSideBar_NotesUpdatesSubscription } from "./__generated__/tokenInfoSideBar_NotesUpdatesSubscription.graphql";
import { useStaticRef } from "../../hooks/use-static-ref";

const TokenInfoSideBar_NotesFragment = graphql`
  fragment tokenInfoSideBar_NotesFragment on Query
  @argumentDefinitions(
    count: { type: "Int", defaultValue: 20 }
    cursor: { type: "String" }
    filter: { type: "NotesFilter" }
    key: { type: "String!" }
  )
  @refetchable(queryName: "tokenInfoSideBar_MoreNotesQuery") {
    notes(first: $count, after: $cursor, filter: $filter)
      @connection(
        key: "tokenInfoSideBar_notes"
        filters: []
        dynamicKey_UNSTABLE: $key
      ) {
      __id
      edges {
        node {
          id
          documentId
          title
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

const TokenInfoSideBar_NotesQuery = graphql`
  query tokenInfoSideBar_NotesQuery($filter: NotesFilter!, $key: String!) {
    ...tokenInfoSideBar_NotesFragment @arguments(filter: $filter, key: $key)
  }
`;

const TokenInfoSideBarRenderer = (props: {
  windowId: string;
  activeNoteId: string | null;
  notesRef: tokenInfoSideBar_NotesFragment$key;
  setShowAll: (showAll: boolean) => void;
  showAll: boolean;
}): React.ReactElement => {
  const { data, isLoading, hasNext, loadNext } = usePagination(
    TokenInfoSideBar_NotesFragment,
    props.notesRef
  );

  const _loadMore = () => {
    if (!hasNext || isLoading) {
      return;
    }

    loadNext(
      10,
      {
        onComplete: (error: Error | null) => {
          console.log("Complete", error);
        },
      }
      // connectionConfig(
      //   `window-${props.windowId}`,
      //   props.showAll ? "All" : "Entrypoint"
      // ),
      // console.error
    );
  };
  const elementRef = React.useRef<HTMLUListElement>(null);
  const actions = useNoteWindowActions();

  const newEdgeIdCounter = React.useRef(0);

  useSubscription<tokenInfoSideBar_NotesUpdatesSubscription>(
    useStaticRef(() => ({
      subscription: TokenInfoSideBar_NotesUpdatesSubscription,
      variables: {
        filter: props.showAll ? "All" : "Entrypoint",
        endCursor: data.notes.pageInfo.endCursor,
        hasNextPage: data.notes.pageInfo.hasNextPage,
      },
      updater: (store, payload) => {
        if (payload.notesUpdates.removedNoteId) {
          const connection = store.get(data.notes.__id);
          if (connection) {
            ConnectionHandler.deleteNode(
              connection,
              payload.notesUpdates.removedNoteId
            );
          }
        }
        if (payload.notesUpdates.addedNode) {
          const connection = store.get(data.notes.__id);
          if (connection) {
            const edge = store
              .getRootField("notesUpdates")
              ?.getLinkedRecord("addedNode")
              ?.getLinkedRecord("edge")!;
            // we need to copy the fields at the other Subscription.notesUpdates.addedNode.edge field
            // will be mutated when the next subscription result is arriving
            const record = store.create(
              // prettier-ignore
              `${data.notes.__id}-${edge.getValue("cursor")!}-${++newEdgeIdCounter.current}`,
              "NoteEdge"
            );

            record.copyFieldsFrom(edge);

            if (payload.notesUpdates.addedNode.previousCursor) {
              ConnectionHandler.insertEdgeBefore(
                connection,
                record,
                payload.notesUpdates.addedNode.previousCursor
              );
            } else if (
              // in case we don't have a previous cursor and there is no nextPage the edge must be added the last list item.
              connection
                ?.getLinkedRecord("pageInfo")
                ?.getValue("hasNextPage") === false
            ) {
              ConnectionHandler.insertEdgeAfter(connection, record);
            }
          }
        }
      },
    }))
  );

  return (
    <>
      <ScrollableList.List
        style={{ marginTop: 0 }}
        ref={elementRef}
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
              isActive={props.activeNoteId === edge.node.documentId}
              onClick={() => {
                if (props.activeNoteId !== edge.node.documentId) {
                  actions.showNoteInWindow(
                    edge.node.documentId,
                    props.windowId
                  );
                }
              }}
            >
              {edge.node.title || "<Untitled Note>"}
            </ScrollableList.ListItemButton>
          </ScrollableList.ListItem>
        ))}
      </ScrollableList.List>
      <FormControl display="flex" alignItems="center" padding="2">
        <FormLabel htmlFor="show-entrypoints" mb="0">
          Show all notes
        </FormLabel>
        <Switch
          id="show-entrypoints"
          isChecked={props.showAll}
          onChange={(ev) => props.setShowAll(ev.target.checked)}
        />
      </FormControl>
    </>
  );
};

const TokenInfoSideBar_SearchQuery = graphql`
  query tokenInfoSideBar_SearchQuery($query: String!) {
    notesSearch(first: 30, query: $query)
      @connection(key: "tokenInfoSideBar_notesSearch", filters: ["query"]) {
      __id
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

const TokenInfoSideBar_NotesUpdatesSubscription = graphql`
  subscription tokenInfoSideBar_NotesUpdatesSubscription(
    $filter: NotesFilter!
    $endCursor: String!
    $hasNextPage: Boolean!
  ) {
    notesUpdates(
      filter: $filter
      endCursor: $endCursor
      hasNextPage: $hasNextPage
    ) {
      removedNoteId
      updatedNote {
        id
        title
        isEntryPoint
      }
      addedNode {
        previousCursor
        edge {
          cursor
          node {
            id
            documentId
            title
          }
        }
      }
    }
  }
`;

export const TokenInfoSideBar = (props: {
  windowId: string;
  activeNoteId: string | null;
}): React.ReactElement | null => {
  const [filter, setFilter] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);
  const notesResult = useQuery<tokenInfoSideBar_NotesQuery>(
    TokenInfoSideBar_NotesQuery,
    {
      filter: showAll ? "All" : "Entrypoint",
      key: `window-${props.windowId}`,
    }
  );
  const notesSearchResult = useQuery<tokenInfoSideBar_SearchQuery>(
    TokenInfoSideBar_SearchQuery,
    {
      query: filter,
    },
    {
      skip: filter === "",
    }
  );

  const [, cachedNotesResult] = useCurrent(
    notesResult,
    !notesResult.error && !notesResult.data,
    0
  );

  const [, cachedData] = useCurrent(
    notesSearchResult,
    !notesSearchResult.error && !notesSearchResult.data,
    0
  );

  const actions = useNoteWindowActions();

  if (cachedNotesResult?.error) {
    return <div>{String(notesResult.error)}</div>;
  }
  if (!cachedNotesResult?.data) {
    return null;
  }
  return (
    <>
      <Box padding="2" height="50px" borderBottom="1px solid lightgray">
        <InputGroup size="sm">
          <InputLeftElement
            pointerEvents="none"
            children={<Icon.Search stroke="gray" boxSize="16px" />}
          />
          <Input
            placeholder="Search Note"
            value={filter}
            onChange={(ev) => setFilter(ev.target.value)}
          />
          {filter !== "" ? (
            <InputRightElement width="3.5rem">
              <Button h="1.5rem" size="xs" onClick={() => setFilter("")}>
                Clear
              </Button>
            </InputRightElement>
          ) : null}
        </InputGroup>
      </Box>
      {filter !== "" && cachedData?.data ? (
        <ScrollableList.List>
          {cachedData.data.notesSearch.edges.map((edge) => (
            <ScrollableList.ListItem key={edge.node.documentId}>
              <ScrollableList.ListItemButton
                isActive={props.activeNoteId === edge.node.documentId}
                onClick={() => {
                  if (props.activeNoteId !== edge.node.documentId) {
                    actions.showNoteInWindow(
                      edge.node.documentId,
                      props.windowId
                    );
                  }
                }}
              >
                {edge.node.title || "<Untitled Note>"}
              </ScrollableList.ListItemButton>
            </ScrollableList.ListItem>
          ))}
        </ScrollableList.List>
      ) : (
        <TokenInfoSideBarRenderer
          windowId={props.windowId}
          activeNoteId={props.activeNoteId}
          notesRef={cachedNotesResult.data}
          showAll={showAll}
          setShowAll={setShowAll}
        />
      )}
    </>
  );
};
