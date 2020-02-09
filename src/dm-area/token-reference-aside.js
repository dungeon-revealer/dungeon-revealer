import React, { useRef, useState, useEffect, useCallback } from "react";
import { MarkdownEditor } from "./note-editor/note-editor";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import "react-mde/lib/styles/css/react-mde-all.css";
import styled from "@emotion/styled/macro";
import * as Button from "../button";
import * as Icon from "../feather-icons";
import { Input } from "../input";
import { useResetState } from "../hooks/use-reset-state";
import { useFetch } from "./fetch-context";

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

const HtmlContainer = styled.div`
  flex-grow: 1;
  overflow-wrap: break-word;

  blockquote {
    margin-left: 0;
    border-left: gray 12px solid;
    padding-left: 24px;
  }
`;

export const TokenReferenceAside = ({ token, close }) => {
  console.log(token.reference.type);
  switch (token.reference.type) {
    case "note":
      return <NoteReference token={token} close={close} />;
    default:
      throw new Error(`Invalid reference ${token.reference}`);
  }
};

const NoteReference = ({ token, close }) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [isEditMode, setIsEditMode] = useResetState(() => false, [token.id]);
  const localFetch = useFetch();
  const [note, setNote] = useState(null);
  const [title, setTitle] = useResetState(note ? note.title : "", [note]);

  useAsyncEffect(
    function*() {
      const response = yield localFetch(`/notes/${token.reference.id}`);
      const body = yield response.json();
      if (body.error) return;
      setNote(body.data.note);
    },
    [localFetch, token]
  );

  const updateNote = useCallback(
    async (id, changes) => {
      const response = await localFetch(`/notes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(changes)
      });
      const body = await response.json();
      setNote(body.data.note);
    },
    [localFetch]
  );

  const previousNote = useRef(note);

  // auto-save title
  useEffect(() => {
    if (
      !note ||
      !previousNote.current ||
      note.id !== previousNote.current.id ||
      title === note.title
    ) {
      return;
    }
    const timeout = setTimeout(() => {
      updateNote(note.id, { title });
    }, 500);

    return () => clearTimeout(timeout);
  }, [updateNote, note, title]);

  useEffect(() => {
    previousNote.current = note;
  });

  if (!note) return null;

  return (
    <Container>
      <Window
        onKeyDown={ev => {
          ev.stopPropagation();
          if (ev.key !== "Escape") return;
          if (!isEditMode) close();
        }}
      >
        <div
          style={{
            display: "flex",
            marginBottom: 16,
            width: "100%"
          }}
        >
          <h3 style={{ display: "flex", flexGrow: 1 }}>
            {token.label ? <div>{token.label}</div> : null}
            <div
              style={{
                paddingLeft: token.label ? 16 : undefined,
                flexGrow: 1
              }}
            >
              {isEditMode ? (
                <Input
                  value={title}
                  onChange={ev => setTitle(ev.target.value)}
                  placeholder="Title"
                />
              ) : (
                note.title
              )}
            </div>
          </h3>
          {isEditMode ? null : (
            <>
              <div style={{ paddingLeft: 8, marginLeft: "auto" }}>
                <Button.Tertiary
                  iconOnly
                  small
                  onClick={() => setIsEditMode(true)}
                >
                  <Icon.EditIcon height={16} />
                </Button.Tertiary>
              </div>
              <div style={{ paddingLeft: 8 }}>
                <Button.Tertiary iconOnly small onClick={close}>
                  <Icon.XIcon height={16} />
                </Button.Tertiary>
              </div>
            </>
          )}
        </div>

        {isEditMode ? (
          <div
            style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
          >
            <MarkdownEditor
              id={note.id}
              content={note.content}
              save={async (id, content) => {
                await updateNote(id, { content });
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 16
              }}
            >
              <div>
                <Button.Tertiary
                  small
                  onClick={() => {
                    setIsEditMode(false);
                  }}
                >
                  <Icon.XIcon />
                  <span>Close Editor</span>
                </Button.Tertiary>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ overflowY: "scroll", overflowX: "hidden" }}>
            <HtmlContainer dangerouslySetInnerHTML={{ __html: note.content }} />
          </div>
        )}
      </Window>
    </Container>
  );
};
