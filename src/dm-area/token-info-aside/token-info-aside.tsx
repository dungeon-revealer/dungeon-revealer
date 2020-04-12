import React from "react";
import styled from "@emotion/styled/macro";
import "react-mde/lib/styles/css/react-mde-all.css";
import { MarkdownEditor } from "../components/markdown-editor";
import * as Button from "../../button";
import * as Icon from "../../feather-icons";
import { Input } from "../../input";
import { useOvermind } from "../../hooks/use-overmind";
import { HtmlContainer } from "../components/html-container";
import { ResolveState } from "overmind";
import { NoteType } from "../overmind/note-store/note-store-state";

const Container = styled.div`
  display: flex;
  align-items: center;
  position: absolute;
  height: 100%;
  top: 0;
  right: 0;
  max-width: 500px;
  width: 100%;
  padding-right: 16px;
  padding-left: 16px;
  pointer-events: none;
`;

const Window = styled.div`
  display: flex;
  flex-direction: column;

  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  background-color: white;
  border-radius: 5px;
  width: 100%;
  height: 60vh;
  padding: 20px;
  pointer-events: all;
`;

export const TokenInfoAside: React.FC<{}> = () => {
  const { actions, state } = useOvermind();
  if (!state.tokenInfoAside.isVisible) return null;

  switch (state.tokenInfoAside.activeToken.mode) {
    case "hasReference":
      switch (state.tokenInfoAside.activeToken.reference.mode) {
        case "CACHE_AND_LOADING":
        case "LOADED":
          return (
            <NoteReference
              note={state.tokenInfoAside.activeToken.reference.node}
              isEditMode={state.tokenInfoAside.isEditMode}
              enterEditMode={() => actions.tokenInfoAside.setEditMode(true)}
              exitEditMode={() => actions.tokenInfoAside.setEditMode(false)}
              close={actions.tokenInfoAside.close}
              updateNoteTitle={actions.tokenInfoAside.updateActiveNoteTitle}
              updateNoteContent={actions.tokenInfoAside.updateActiveNoteContent}
            />
          );
      }
  }
  return null;
};

const NoteReference: React.FC<{
  close: () => void;
  isEditMode: boolean;
  enterEditMode: () => void;
  exitEditMode: () => void;
  note: ResolveState<NoteType>;
  updateNoteTitle: (value: string) => void;
  updateNoteContent: (value: string) => void;
}> = ({
  close,
  isEditMode,
  enterEditMode,
  exitEditMode,
  note,
  updateNoteTitle,
  updateNoteContent,
}) => {
  useOvermind();

  return (
    <Container>
      <Window
        onKeyDown={(ev) => {
          ev.stopPropagation();
          if (ev.key !== "Escape") return;
          if (!isEditMode) close();
        }}
      >
        <div
          style={{
            display: "flex",
            marginBottom: 16,
            width: "100%",
          }}
        >
          {isEditMode ? (
            <>
              <Input
                value={note.title}
                onChange={(ev) => updateNoteTitle(ev.target.value)}
                placeholder="Title"
              />
              <div style={{ paddingLeft: 8 }}>
                <Button.Tertiary iconOnly small onClick={exitEditMode}>
                  <Icon.SaveIcon height={16} />
                </Button.Tertiary>
              </div>
              <div style={{ paddingLeft: 8 }}>
                <Button.Tertiary iconOnly small onClick={close}>
                  <Icon.XIcon height={16} />
                </Button.Tertiary>
              </div>
            </>
          ) : (
            <>
              <h3
                style={{
                  flexGrow: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {note.title}
              </h3>
              <div style={{ flexShrink: 0, display: "flex" }}>
                <div style={{ paddingLeft: 8, marginLeft: "auto" }}>
                  <Button.Tertiary
                    iconOnly
                    small
                    onClick={() => enterEditMode()}
                  >
                    <Icon.EditIcon height={16} />
                  </Button.Tertiary>
                </div>
                <div style={{ paddingLeft: 8 }}>
                  <Button.Tertiary iconOnly small onClick={close}>
                    <Icon.XIcon height={16} />
                  </Button.Tertiary>
                </div>
              </div>
            </>
          )}
        </div>
        {isEditMode ? (
          <div
            style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
          >
            <MarkdownEditor value={note.content} onChange={updateNoteContent} />
          </div>
        ) : (
          <div style={{ overflowY: "scroll", overflowX: "hidden" }}>
            <HtmlContainer markdown={note.content} />
          </div>
        )}
      </Window>
    </Container>
  );
};
