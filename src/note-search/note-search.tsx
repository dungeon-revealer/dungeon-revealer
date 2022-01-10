import * as React from "react";
import styled from "@emotion/styled/macro";
import graphql from "babel-plugin-relay/macro";
import { useQuery } from "relay-hooks";
import { noteSearch_SearchQuery } from "./__generated__/noteSearch_SearchQuery.graphql";
import { useNoteWindowActions } from "../dm-area/token-info-aside";
import * as Icon from "../feather-icons";
import { darken } from "polished";
import { useOnClickOutside } from "../hooks/use-on-click-outside";
import { useCurrent } from "../hooks/use-current";

const Container = styled.div`
  position: absolute;
  left: 50%;
  top: 10%;
  padding-top: 12px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  padding-left: 24px;
  padding-right: 24px;
  z-index: 200;
`;

const InputLabel = styled.label`
  display: flex;
  font-size: 24px;
  margin-bottom: 12px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  justify-content: stretch;
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
  height: 50px;
`;

const NoteSearchInput = styled.input`
  font-size: inherit;
  padding: 12px;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  border-bottom-left-radius: 0;
  border-top-left-radius: 0;
  border: none;
  width: 100%;
  height: 50px;
`;

const NoteSearch_SearchQuery = graphql`
  query noteSearch_SearchQuery($query: String!) {
    notesSearch(query: $query) {
      edges {
        node {
          documentId
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
  margin-left: auto;
  margin-right: auto;
  background-color: #fff;
`;

const Result = styled.button`
  display: block;
  text-align: left;
  cursor: pointer;
  background-color: #fff;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  padding: 0;
  border: 0;
  padding-bottom: 4px;
  padding-top: 4px;
  border-bottom: 1px solid lightgray;
  width: 100%;
  padding-left: 12px;
  padding-right: 12px;

  &:hover,
  &:focus {
    background-color: ${darken(0.1, "#fff")};
  }

  &:first-of-type {
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

export const NoteSearch = (props: {
  close: () => void;
}): React.ReactElement => {
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<null | HTMLDivElement>(null);
  useOnClickOutside<HTMLDivElement>(ref, props.close);
  const noteWindowActions = useNoteWindowActions();

  const _data = useQuery<noteSearch_SearchQuery>(NoteSearch_SearchQuery, {
    query,
  });
  const isLoading = !_data.data && !_data.error;

  const [, notesSearch] = useCurrent(_data.data?.notesSearch, isLoading, 300);

  return (
    <Container
      onContextMenu={(ev) => ev.stopPropagation()}
      onKeyDown={(ev) => {
        if (ev.key === "Escape") {
          props.close();
        }
      }}
      ref={ref}
    >
      <InputLabel>
        <IconContainer>
          <Icon.Search boxSize="25px" />
        </IconContainer>
        <NoteSearchInput
          autoFocus
          onChange={(ev) => setQuery(ev.target.value)}
          value={query}
          placeholder="What are you looking for?"
        />
      </InputLabel>
      <ResultContainer>
        {notesSearch
          ? notesSearch.edges.map((edge) => (
              <Result
                onClick={() => {
                  noteWindowActions.focusOrShowNoteInNewWindow(
                    edge.node.documentId
                  );
                  props.close();
                }}
              >
                <ResultTitle>{edge.node.title}</ResultTitle>
                <ResultContent>{edge.node.preview}</ResultContent>
              </Result>
            ))
          : null}
      </ResultContainer>
    </Container>
  );
};
