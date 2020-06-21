import * as React from "react";
import styled from "@emotion/styled/macro";
import graphql from "babel-plugin-relay/macro";
import { useLazyLoadQuery } from "react-relay/hooks";
import { noteSearch_SearchQuery } from "./__generated__/noteSearch_SearchQuery.graphql";
import { SetActiveNoteIdContext } from "../dm-area/token-info-aside";

const Container = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  padding-top: 12px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  justify-content: center;
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

const ResultWrapper = styled.div`
  margin-bottom: 8px;
  width: 100%;
  padding-left: 8px;
  padding-right: 8px;
  width: 50%;
  margin-bottom: 8px;
  display: flex;
`;

const Result = styled.button`
  all: unset;
  display: block;
  cursor: pointer;
  border: none;
  background: #fff;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 8px;
`;

const ResultTitle = styled.div`
  font-weight: bold;
`;

const ResultContent = styled.div``;

const SearchResult: React.FC<{ query: string; clearQuery: () => void }> = ({
  query,
  clearQuery,
}) => {
  const setActiveNoteId = React.useContext(SetActiveNoteIdContext);
  const data = useLazyLoadQuery<noteSearch_SearchQuery>(
    NoteSearch_SearchQuery,
    {
      query,
    }
  );

  return (
    <ResultContainer>
      {data.notesSearch.edges.map((edge) => (
        <ResultWrapper style={{ marginBottom: 6 }}>
          <Result
            onClick={() => {
              clearQuery();
              setActiveNoteId(edge.node.noteId);
            }}
          >
            <ResultTitle>{edge.node.title}</ResultTitle>
            <ResultContent>{edge.node.preview}</ResultContent>
          </Result>
        </ResultWrapper>
      ))}
    </ResultContainer>
  );
};

export const NoteSearch: React.FC<{}> = () => {
  const [query, setQuery] = React.useState("");
  return (
    <Container>
      {/* TODO: BETTER STYLES :) */}
      <div>
        <input
          onChange={(ev) => setQuery(ev.target.value)}
          value={query}
          style={{ display: "block", marginLeft: "auto", marginRight: "auto" }}
        />
      </div>
      <React.Suspense fallback={null}>
        {query.trim() ? (
          <SearchResult query={query} clearQuery={() => setQuery("")} />
        ) : null}
      </React.Suspense>
    </Container>
  );
};
