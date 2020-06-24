import * as React from "react";
import styled from "@emotion/styled/macro";
import graphql from "babel-plugin-relay/macro";
import { useLazyLoadQuery } from "react-relay/hooks";
import { noteSearch_SearchQuery } from "./__generated__/noteSearch_SearchQuery.graphql";
import { useNoteWindowActions } from "../dm-area/token-info-aside";
import * as Icon from "../feather-icons";
import { darken } from "polished";
import { useOnClickOutside } from "../hooks/use-on-click-outside";

const Container = styled.div`
  position: absolute;
  left: 50%;
  top: 10%;
  padding-top: 12px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 600px;
  width: 100%;
  margin-left: 24px;
  margin-right: 24px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  z-index: 200;
`;

const InputLabel = styled.label`
  display: flex;
  font-size: 24px;
  margin-bottom: 12px;
`;

const IconContainer = styled.div`
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
  pointer-events: default;
  font-size: inherit;
`;

const NoteSearchInput = styled.input`
  font-size: inherit;
  padding: 12px;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  border: none;
  width: 100%;
`;

const NoteSearch_SearchQuery = graphql`
  query noteSearch_SearchQuery($query: String!) {
    notesSearch(query: $query) {
      edges {
        node {
          noteId
          title
          preview
        }
      }
    }
  }
`;

const ResultContainer = styled.div`
  max-width: 600px;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
`;

const Result = styled.button`
  display: block;
  text-align: left;
  cursor: pointer;
  border: none;
  background: #fff;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  padding-bottom: 4px;
  padding-top: 4px;
  border-bottom: 1px solid lightgray;
  width: 100%;
  padding-left: 12px;
  padding-right: 12px;

  &:hover,
  &:focus {
    background-color: ${darken(0.1, "white")};
  }

  &:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  &:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;

const ResultTitle = styled.div`
  font-weight: bold;
`;

const ResultContent = styled.div``;

const SearchResult: React.FC<{
  query: string;
  close: () => void;
}> = ({ query, close }) => {
  const noteWindowActions = useNoteWindowActions();

  const data = useLazyLoadQuery<noteSearch_SearchQuery>(
    NoteSearch_SearchQuery,
    {
      query,
    }
  );

  return (
    <ResultContainer>
      {data.notesSearch.edges.map((edge) => (
        <Result
          onClick={() => {
            noteWindowActions.focusOrShowNoteInNewWindow(edge.node.noteId);
            close();
          }}
        >
          <ResultTitle>{edge.node.title}</ResultTitle>
          <ResultContent>{edge.node.preview}</ResultContent>
        </Result>
      ))}
    </ResultContainer>
  );
};

export const NoteSearch: React.FC<{ close: () => void }> = ({ close }) => {
  const [query, setQuery] = React.useState("");
  const ref = useOnClickOutside<HTMLDivElement>(close);

  return (
    <Container
      onContextMenu={(ev) => ev.stopPropagation()}
      onKeyDown={(ev) => {
        if (ev.keyCode === 27) {
          close();
        }
      }}
      ref={ref}
    >
      <InputLabel>
        <IconContainer>
          <Icon.SearchIcon height={25} width={25} />
        </IconContainer>
        <NoteSearchInput
          autoFocus
          onChange={(ev) => setQuery(ev.target.value)}
          value={query}
          placeholder="What are you looking for?"
        />
      </InputLabel>
      <React.Suspense fallback={null}>
        {query.trim() ? <SearchResult query={query} close={close} /> : null}
      </React.Suspense>
    </Container>
  );
};
