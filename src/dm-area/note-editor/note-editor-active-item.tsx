import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import debounce from "lodash/debounce";
import { useMutation, useFragment } from "react-relay/hooks";
import type { noteEditorActiveItem_nodeFragment$key } from "./__generated__/noteEditorActiveItem_nodeFragment.graphql";
import { noteEditorActiveItemNoteUpdateMutation } from "./__generated__/noteEditorActiveItemNoteUpdateMutation.graphql";
import { Modal } from "../../modal";
import * as Button from "../../button";
import * as Icons from "../../feather-icons";
import styled from "@emotion/styled/macro";
import { Input } from "../../input";
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

export const NoteEditorActiveItem: React.FC<{
  isEditMode: boolean;
  toggleIsEditMode: () => void;
  deleteNote: () => void;
  nodeRef: noteEditorActiveItem_nodeFragment$key;
}> = ({ isEditMode, toggleIsEditMode, deleteNote, nodeRef }) => {
  const node = useFragment(NoteEditorActiveItem_NodeFragment, nodeRef);
  const sideBarRef = React.useRef<HTMLDivElement>(null);

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

  const [title, setTitle] = React.useState(node.title || "");
  const [content, setContent] = React.useState(node.content || "");

  React.useEffect(() => {
    update({ title, content });
  }, [title, content]);

  return (
    <Modal.Content>
      <HeaderContainer>
        {isEditMode ? (
          <>
            <Input
              autoFocus
              placeholder="Note title"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
            />
            <Button.Tertiary
              iconOnly
              onClick={() => {
                update.cancel();
                mutate({
                  variables: { input: { id: node.id, title, content } },
                });
                toggleIsEditMode();
              }}
              style={{ marginLeft: 16 }}
            >
              <Icons.SaveIcon height={16} />
            </Button.Tertiary>
          </>
        ) : (
          <Header>
            <Heading>{title || "<Untitled Note>"}</Heading>
            <div>
              <Button.Tertiary iconOnly onClick={toggleIsEditMode}>
                <Icons.EditIcon height={16} />
              </Button.Tertiary>
            </div>
          </Header>
        )}
      </HeaderContainer>
      {isEditMode ? (
        <EditorContainer>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            sideBarRef={sideBarRef}
          />
          <NoteEditorSideReference ref={sideBarRef} />
        </EditorContainer>
      ) : (
        <HtmlContainerWrapper>
          <HtmlContainer markdown={content} />
        </HtmlContainerWrapper>
      )}
      <div ref={sideBarRef} />

      <Modal.Footer>
        <Button.Tertiary onClick={deleteNote}>
          <Icons.TrashIcon height={20} width={20} />
          <span>Delete Note</span>
        </Button.Tertiary>
      </Modal.Footer>
    </Modal.Content>
  );
};

const Header = styled.div`
  white-space: nowrap;
  width: 100%;
  display: flex;
  align-items: center;
`;

const Heading = styled.h3`
  text-overflow: ellipsis;
  overflow: hidden;
  margin-right: 16px;
`;

const HeaderContainer = styled.div`
  display: flex;
  margin-left: 16px;
  margin-right: 16px;
  padding-top: 8px;
  padding-bottom: 16px;
`;

const HtmlContainerWrapper = styled.div`
  padding-left: 16px;
  padding-right: 16px;
  flex-grow: 1;
  overflow-y: scroll;
`;

const NoteEditorSideReference = styled.div`
  position: absolute;
  left: calc(100% + 12px);
  top: 0;
  width: 300px;
  background: white;
  border-left: 1px solid lightgrey;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
`;

const EditorContainer = styled.div`
  position: relative;
  flex: 1;
`;
