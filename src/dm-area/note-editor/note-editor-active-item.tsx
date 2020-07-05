import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import debounce from "lodash/debounce";
import { useMutation, useFragment } from "relay-hooks";
import type { noteEditorActiveItem_nodeFragment$key } from "./__generated__/noteEditorActiveItem_nodeFragment.graphql";
import { noteEditorActiveItemNoteUpdateMutation } from "./__generated__/noteEditorActiveItemNoteUpdateMutation.graphql";
import styled from "@emotion/styled/macro";
import { MarkdownEditor } from "../components/markdown-editor";
import { HtmlContainer } from "../components/html-container";
import { useStaticRef } from "../../hooks/use-static-ref";

const NoteEditorActiveItem_NodeFragment = graphql`
  fragment noteEditorActiveItem_nodeFragment on Note {
    id
    title
    content
  }
`;

const NoteEditorActiveItemNoteUpdateMutation = graphql`
  mutation noteEditorActiveItemNoteUpdateMutation($input: NoteUpdateInput!) {
    noteUpdate(input: $input) {
      note {
        ...noteEditorActiveItem_nodeFragment
      }
    }
  }
`;

const extractTitleFromContent = (content: string) => {
  const subject = (content.split("\n")[0] || "")
    .replace(/(<!--|-->)/g, "")
    .replace(/[*#~]/g, "")
    .replace(/<.*\/>/g, "")
    .replace(/<.*>/g, "")
    .trim();
  if (!subject) return "<Untitled Note>";
  return subject;
};

export const NoteEditorActiveItem: React.FC<{
  isEditMode: boolean;
  toggleIsEditMode: () => void;
  nodeRef: noteEditorActiveItem_nodeFragment$key;
  sideBarRef: React.RefObject<HTMLDivElement>;
  editorOnResizeRef?: React.MutableRefObject<() => void>;
}> = ({ isEditMode, nodeRef, sideBarRef, editorOnResizeRef }) => {
  const node = useFragment(NoteEditorActiveItem_NodeFragment, nodeRef);

  const [mutate] = useMutation<noteEditorActiveItemNoteUpdateMutation>(
    NoteEditorActiveItemNoteUpdateMutation
  );

  const mutateRef = React.useRef(mutate);

  React.useEffect(() => {
    mutateRef.current = mutate;
  });

  const update = useStaticRef(() =>
    debounce(
      (input: { title: string; content: string }) =>
        mutateRef.current({
          variables: {
            input: { ...input, id: node.id },
          },
        }),
      500
    )
  );

  const [content, setContent] = React.useState(node.content || "");

  // We wanna auto-save the node only after the content has changed
  const previousContent = React.useRef(content);

  React.useEffect(() => {
    if (previousContent.current !== content) {
      update({
        title: extractTitleFromContent(content),
        content,
      });
    }
    previousContent.current = content;
  }, [content]);

  return (
    <>
      {isEditMode ? (
        <EditorContainer>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            sideBarRef={sideBarRef}
            editorOnResizeRef={editorOnResizeRef}
          />
        </EditorContainer>
      ) : (
        <HtmlContainerWrapper>
          <HtmlContainer markdown={content} />
        </HtmlContainerWrapper>
      )}
    </>
  );
};

const HtmlContainerWrapper = styled.div`
  padding-left: 16px;
  padding-right: 16px;
  flex-grow: 1;
  overflow-y: scroll;
`;

const EditorContainer = styled.div`
  position: relative;
  flex: 1;
  height: 100%;
  padding-top: 8px;
`;
