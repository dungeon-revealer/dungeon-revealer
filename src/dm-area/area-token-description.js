import React, { useRef, useMemo } from "react";
import ReactMde from "react-mde";
import { Converter } from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";
import styled from "@emotion/styled/macro";
import * as Button from "../button";
import * as Icon from "../feather-icons";
import { Input } from "../input";
import { useResetState } from "../hooks/use-reset-state";

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

export const AreaTokenDescription = ({ token, updateToken, close }) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [isEditMode, setIsEditMode] = useResetState(() => false, [token.id]);
  const [selectedTab, setSelectedTab] = React.useState("write");
  const [description, setDescription] = useResetState(token.description || "", [
    token.description
  ]);

  const [title, setTitle] = useResetState(token.title || "", [token.title]);

  const ref = useRef(null);

  const markdown = useMemo(() => {
    const converter = new Converter();
    return converter.makeHtml(token.description);
  }, [token.description]);

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
                token.title
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
        <div style={{ overflowY: "scroll", overflowX: "hidden" }}>
          {isEditMode ? (
            <div style={{ flexGrow: 1 }}>
              <ReactMde
                ref={ref}
                value={description}
                onChange={setDescription}
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                generateMarkdownPreview={() => Promise.resolve(markdown)}
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
                    <span>Cancel</span>
                  </Button.Tertiary>
                </div>
                <div style={{ marginLeft: 16 }}>
                  <Button.Primary
                    small
                    onClick={() => {
                      updateToken({ title, description });
                      setIsEditMode(false);
                    }}
                  >
                    <Icon.CheckIcon />
                    <span>Save</span>
                  </Button.Primary>
                </div>
              </div>
            </div>
          ) : (
            <HtmlContainer dangerouslySetInnerHTML={{ __html: markdown }} />
          )}
        </div>
      </Window>
    </Container>
  );
};
