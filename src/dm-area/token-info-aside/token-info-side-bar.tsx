import * as React from "react";
import * as ScrollableList from "../components/scrollable-list";
import graphql from "babel-plugin-relay/macro";
import { usePagination, ConnectionConfig, useQuery } from "relay-hooks";
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

const TokenInfoSideBar_NotesFragment = graphql`
  fragment tokenInfoSideBar_NotesFragment on Query
  @argumentDefinitions(
    count: { type: "Int", defaultValue: 20 }
    cursor: { type: "String" }
    filter: { type: "NotesFilter" }
  ) {
    notes(first: $count, after: $cursor, filter: $filter)
      @connection(key: "tokenInfoSideBar_notes", filters: []) {
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

const TokenInfoSideBar_NotesQuery = graphql`
  query tokenInfoSideBar_NotesQuery($filter: NotesFilter!) {
    ...tokenInfoSideBar_NotesFragment @arguments(filter: $filter)
  }
`;

const connectionConfig: ConnectionConfig = {
  getVariables(_, { count, cursor }) {
    return {
      count,
      cursor,
    };
  },
  query: graphql`
    query tokenInfoSideBar_MoreQuery($count: Int!, $cursor: String) {
      ...tokenInfoSideBar_NotesFragment
        @arguments(count: $count, cursor: $cursor)
    }
  `,
};

const TokenInfoSideBarRenderer = (props: {
  windowId: string;
  activeNoteId: string | null;
  notesRef: tokenInfoSideBar_NotesFragment$key;
  setShowAll: (showAll: boolean) => void;
  showAll: boolean;
}): React.ReactElement => {
  const [data, { isLoading, hasMore, loadMore, ...p }] = usePagination(
    TokenInfoSideBar_NotesFragment,
    props.notesRef
  );

  const _loadMore = () => {
    if (!hasMore() || isLoading()) {
      return;
    }

    loadMore(connectionConfig, 10, console.error);
  };
  const elementRef = React.useRef<HTMLUListElement>(null);
  const actions = useNoteWindowActions();

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
    !notesResult.error && !notesResult.props,
    0
  );

  const [, cachedData] = useCurrent(
    notesSearchResult,
    !notesSearchResult.error && !notesSearchResult.props,
    0
  );

  const actions = useNoteWindowActions();

  if (cachedNotesResult?.error) {
    return <div>{String(notesResult.error)}</div>;
  }
  if (!cachedNotesResult?.props) {
    return null;
  }
  return (
    <>
      <Box padding="2" height="50px" borderBottom="1px solid lightgray">
        <InputGroup size="sm">
          <InputLeftElement
            pointerEvents="none"
            children={<Icon.SearchIcon color="gray" size={16} />}
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
      {filter !== "" && cachedData?.props ? (
        <ScrollableList.List>
          {cachedData.props.notesSearch.edges.map((edge) => (
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
          notesRef={cachedNotesResult.props}
          showAll={showAll}
          setShowAll={setShowAll}
        />
      )}
    </>
  );
};
