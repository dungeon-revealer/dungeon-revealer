import React from "react";
import * as ReactDom from "react-dom";
import styled from "@emotion/styled/macro";
import {
  Range as MonacoRange,
  Position as MonacoPosition,
  editor,
} from "monaco-editor";
import { parseDOM } from "htmlparser2";
import MonacoEditor from "react-monaco-editor";
import * as Button from "../../button";
import { sendRequest, ISendRequestTask } from "../../http-request";
import { buildApiUrl } from "../../public-url";
import { SelectLibraryImageModal } from "./select-library-image-modal";

import { transparentize } from "polished";
import {
  BoldIcon,
  ItalicIcon,
  ImageIcon,
  ListIcon,
  Link,
} from "../../feather-icons";
import { useSelectFileDialog } from "../../hooks/use-select-file-dialog";
import { useAccessToken } from "../../hooks/use-access-token";

const insertImageIntoEditor = (
  editor: editor.IStandaloneCodeEditor,
  id: string
) => {
  const model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !editor || !selection) return;

  const placeholderTemplate = `<Image id="${id}" />`;

  editor.executeEdits("", [
    {
      range: new MonacoRange(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn
      ),
      text: placeholderTemplate,
    },
  ]);
};

const useImageCommand: (opts: {
  uploadFile: (file: File) => Promise<string | null>;
  editorReference: React.RefObject<MonacoEditor>;
}) => [React.ReactNode, () => void] = ({ uploadFile, editorReference }) => {
  const [reactTreeNode, showFileDialog] = useSelectFileDialog(
    React.useCallback((file) => {
      stateRef.current.onSelectImage?.(file);
    }, [])
  );

  const stateRef = React.useRef<{
    isMounted: boolean;
    onSelectImage: ((file: File) => void) | null;
  }>({
    isMounted: true,
    onSelectImage: null,
  });

  React.useEffect(
    () => () => {
      stateRef.current.isMounted = false;
    },
    []
  );

  const onClick = React.useCallback(() => {
    stateRef.current.onSelectImage = (file: File) => {
      const editor = editorReference.current?.editor;
      const model = editor?.getModel();
      const selection = editor?.getSelection();
      if (!model || !editor || !selection) return;

      const placeholderTemplate = `[Uploading ${file.name}...]`;

      editor.executeEdits("", [
        {
          range: new MonacoRange(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          ),
          text: placeholderTemplate,
        },
      ]);
      editor.focus();

      uploadFile(file).then((id) => {
        if (!stateRef.current.isMounted) return;
        const editor = editorReference.current?.editor;
        const model = editor?.getModel();
        const selection = editor?.getSelection();
        if (!model || !editor || !selection) return;

        const content = id
          ? `<Image id="${id}" />`
          : `[Uploading ${file.name} failed.]`;

        const value = editor.getValue();

        const index = value.indexOf(placeholderTemplate);

        if (index === -1) {
          // add at the end
          const line = model.getLineCount();
          const column = model.getLineMaxColumn(line);
          editor.executeEdits("", [
            {
              range: new MonacoRange(line, column, line, column),
              text: `\n\n${content}`,
            },
          ]);
        } else {
          const start = model.getPositionAt(index);
          const end = model.getPositionAt(index + placeholderTemplate.length);
          editor.executeEdits("", [
            {
              range: new MonacoRange(
                start.lineNumber,
                start.column,
                end.lineNumber,
                end.column
              ),
              text: content,
            },
          ]);
        }
      });
    };

    showFileDialog();
  }, [showFileDialog]);

  return [reactTreeNode, onClick];
};

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;

  .active-image-component {
    background-color: ${transparentize(0.5, "pink")};
  }
`;

/**
 * Takes a string that includes a single HTML element and invokes the callback with the corresponding AST.
 */
const parseTagAstFromHtmlTagString = (input: string) => {
  const result = parseDOM(input, {
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
  });

  return result.length ? result[0] : null;
};

const getMarkdownImageSelectionRange = (
  column: number,
  text: string
): { id: string; position: { start: number; end: number } } | null => {
  const IMAGE_START_TAG = "<Image";

  // check whether cursor is inside a image definition
  let characterBeforeCounter = 0;
  let startIndex = -1;

  while (characterBeforeCounter <= 100) {
    const index = column - characterBeforeCounter;
    if (text[index] === "<") {
      if (text.substr(index, IMAGE_START_TAG.length) === IMAGE_START_TAG) {
        startIndex = index;
      }
      break;
    } else if (text[index] === ">") {
      // encountered another tag -> abort mission!
      break;
    }

    characterBeforeCounter = characterBeforeCounter + 1;
  }

  if (startIndex === -1) {
    return null;
  }

  let characterAfterCounter = 0;
  let endIndex = -1;
  while (characterAfterCounter <= 100) {
    const index = column + characterAfterCounter;

    if (text[index] === "/" && text[index + 1] === ">") {
      endIndex = index + 2;
      break;
    }

    characterAfterCounter = characterAfterCounter + 1;
  }

  if (endIndex === -1) {
    return null;
  }

  const part = text.substring(startIndex, endIndex);

  const node = parseTagAstFromHtmlTagString(part);
  if (!node) return null;

  return {
    // @ts-ignore
    id: node.attribs.id,
    position: { start: startIndex, end: endIndex },
  };
};

const replaceRange = (
  s: string,
  start: number,
  end: number,
  substitute: string
) => {
  return s.substring(0, start) + substitute + s.substring(end);
};

const SideMenu = styled.div`
  padding: 16px;
`;

const SideMenuTitle = styled.div`
  font-weight: bold;
  margin-bottom: 12px;
`;

const SideMenuImage = styled.img`
  max-width: 100%;
  max-height: 150px;
  display: block;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 12px;
`;

const TextToolBar = styled.div`
  display: flex;
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: 8px;
`;

const ToolBarButton = styled.button`
  border-color: white;
  border-radius: 5px;
  padding: 8px;
  display: flex;
  background: white;
  cursor: pointer;
  border: none;
  &:hover > svg {
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.3));
  }
`;

const ToolBarButtonDropDown = styled.div`
  display: inline-block;
  position: relative;
  background: white;

  &:hover [data-menu] {
    display: block;
  }
`;

const DropDownMenu = styled.div`
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  height: 50px;
  z-index: 1;
  padding: 0;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  height: auto;
`;

const DropDownMenuInner = styled.div`
  background-color: #fff;
  min-width: 140px;
`;

const DropDownMenuItem = styled.button`
  background: white;
  border: none;
  display: block;
  width: 100%;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  &:hover {
    background-color: #e6e6e6;
  }
`;

export const MarkdownEditor: React.FC<{
  value: string;
  onChange: (input: string) => void;
  sideBarRef: React.RefObject<HTMLElement>;
  editorOnResizeRef?: React.MutableRefObject<() => void>;
}> = ({ value, onChange, sideBarRef, editorOnResizeRef }) => {
  const uploadTaskRef = React.useRef<ISendRequestTask | null>(null);
  const accessToken = useAccessToken();

  const uploadFile = React.useCallback(
    (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const task = (uploadTaskRef.current = sendRequest({
        url: buildApiUrl("/images"),
        method: "POST",
        body: formData,
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : null,
        },
      }));

      return task.done.then((result) => {
        if (result.type !== "success") return null;
        const json = JSON.parse(result.data as string);
        return json.data.item.id;
      });
    },
    [accessToken]
  );

  const ref = React.useRef<MonacoEditor | null>(null);
  const editorStateRef = React.useRef({
    decorations: [] as string[],
  });

  const [uploadImageNode, onClickImageButton] = useImageCommand({
    uploadFile,
    editorReference: ref,
  });

  React.useEffect(
    () => () => {
      uploadTaskRef.current?.abort();
      if (editorOnResizeRef) {
        editorOnResizeRef.current = () => undefined;
      }
    },
    []
  );

  const [menu, setMenu] = React.useState<{
    type: "image";
    data: {
      id: string;
      textPosition: {
        start: number;
        end: number;
      };
    };
  } | null>(null);

  // TODO: Ideally we only have one showMediaLibrary state that is more complex

  // media library for changing the selection of an existing Image component
  const [showMediaLibrary, setShowMediaLibrary] = React.useState(false);

  // media library for inserting a new Image component
  const [showMediaLibrary2, setShowMediaLibrary2] = React.useState(false);
  const selectImageFromLibrary = React.useCallback(() => {
    setShowMediaLibrary2(true);
  }, []);

  return (
    <Container>
      <TextToolBar>
        <ToolBarButton
          title="Bold"
          onClick={() => {
            const editor = ref.current?.editor;
            const model = editor?.getModel();
            const selection = editor?.getSelection();
            if (!model || !editor || !selection) return;
            const selectedText = model.getValueInRange(selection);
            if (
              selectedText.trim().startsWith("**") &&
              selectedText.trim().endsWith("**")
            ) {
              editor.executeEdits("", [
                {
                  range: new MonacoRange(
                    selection.startLineNumber,
                    selection.startColumn,
                    selection.endLineNumber,
                    selection.endColumn
                  ),
                  text: model.getValueInRange(selection).replace(/\*\*/g, ""),
                },
              ]);
            } else {
              editor.executeEdits("", [
                {
                  range: new MonacoRange(
                    selection.startLineNumber,
                    selection.startColumn,
                    selection.endLineNumber,
                    selection.endColumn
                  ),
                  text: `**` + model.getValueInRange(selection) + `**`,
                },
              ]);
            }
            editor.focus();
          }}
        >
          <BoldIcon height={16} />
        </ToolBarButton>
        <ToolBarButton
          onClick={() => {
            const editor = ref.current?.editor;
            const model = editor?.getModel();
            const selection = editor?.getSelection();
            if (!model || !editor || !selection) return;
            const selectedText = model.getValueInRange(selection);
            if (
              selectedText.trim().startsWith("*") &&
              selectedText.trim().endsWith("*")
            ) {
              editor.executeEdits("", [
                {
                  range: new MonacoRange(
                    selection.startLineNumber,
                    selection.startColumn,
                    selection.endLineNumber,
                    selection.endColumn
                  ),
                  text: model.getValueInRange(selection).replace(/\*/g, ""),
                },
              ]);
            } else {
              editor.executeEdits("", [
                {
                  range: new MonacoRange(
                    selection.startLineNumber,
                    selection.startColumn,
                    selection.endLineNumber,
                    selection.endColumn
                  ),
                  text: `*` + model.getValueInRange(selection) + `*`,
                },
              ]);
            }
            editor.focus();
          }}
        >
          <ItalicIcon height={16} />
        </ToolBarButton>
        <ToolBarButton
          title="Insert List"
          onClick={() => {
            const editor = ref.current?.editor;
            const model = editor?.getModel();
            const selection = editor?.getSelection();
            if (!model || !editor || !selection) return;
            let selectedText = model.getLineContent(selection.startLineNumber);
            const length = selectedText.length;
            if (selectedText.startsWith("-")) {
              selectedText = selectedText.replace(/- /, "");
            } else {
              selectedText = "- " + selectedText.trimLeft();
            }

            editor.executeEdits("", [
              {
                range: new MonacoRange(
                  selection.startLineNumber,
                  1,
                  selection.startLineNumber,
                  length + 1
                ),
                text: selectedText,
              },
            ]);
            editor.setPosition(
              new MonacoPosition(selection.startLineNumber, length + 1 + 2)
            );
            editor.focus();
          }}
        >
          <ListIcon height={16} />
        </ToolBarButton>
        <ToolBarButtonDropDown>
          <ToolBarButton title="Insert Image" onClick={onClickImageButton}>
            <ImageIcon height={16} />
          </ToolBarButton>
          <DropDownMenu data-menu>
            <DropDownMenuInner>
              <DropDownMenuItem onClick={onClickImageButton}>
                Upload
              </DropDownMenuItem>
              <DropDownMenuItem onClick={selectImageFromLibrary}>
                Select from Library
              </DropDownMenuItem>
            </DropDownMenuInner>
          </DropDownMenu>
        </ToolBarButtonDropDown>
      </TextToolBar>
      <MonacoEditor
        value={value}
        onChange={onChange}
        language="markdown"
        options={{
          minimap: { enabled: false },
          lineNumbers: "off",
          wordWrap: "on",
        }}
        ref={ref}
        editorDidMount={(editor) => {
          if (editorOnResizeRef) {
            editorOnResizeRef.current = () => {
              editor.layout();
            };
          }

          editor.onDidChangeCursorPosition((event) => {
            const text = editor.getValue();
            const model = editor.getModel();
            if (!model) return;
            const positionOffset = model.getOffsetAt(event.position);
            const imageSelectionRange = getMarkdownImageSelectionRange(
              positionOffset,
              text
            );

            if (imageSelectionRange) {
              const startPosition = model.getPositionAt(
                imageSelectionRange.position.start
              );
              const endPosition = model.getPositionAt(
                imageSelectionRange.position.end
              );
              editorStateRef.current.decorations = editor.deltaDecorations(
                editorStateRef.current.decorations,
                [
                  {
                    range: new MonacoRange(
                      startPosition.lineNumber,
                      startPosition.column,
                      endPosition.lineNumber,
                      endPosition.column
                    ),
                    options: { inlineClassName: ".active-image-component" },
                  },
                ]
              );

              setMenu({
                type: "image",
                data: {
                  id: imageSelectionRange.id,
                  textPosition: {
                    ...imageSelectionRange.position,
                  },
                },
              });
            } else {
              editorStateRef.current.decorations = editor.deltaDecorations(
                editorStateRef.current.decorations,
                []
              );
              setMenu(null);
            }
          });
        }}
      />
      {uploadImageNode}
      {menu && sideBarRef.current
        ? ReactDom.createPortal(
            <SideMenu>
              <SideMenuTitle>
                <Link height={16} style={{ marginBottom: "-2px" }} /> Linked
                Image
              </SideMenuTitle>
              <SideMenuImage src={buildApiUrl(`/images/${menu.data.id}`)} />
              <Button.Primary small onClick={() => setShowMediaLibrary(true)}>
                Change
              </Button.Primary>
              {showMediaLibrary ? (
                <SelectLibraryImageModal
                  close={() => setShowMediaLibrary(false)}
                  onSelect={(id) => {
                    if (!ref.current?.editor) return;
                    const editor = ref.current.editor;
                    const model = editor.getModel();
                    if (!model) return;
                    const value = editor.getValue();

                    const newTag = `<Image id="${id}" />`;
                    const newValue = replaceRange(
                      value,
                      menu.data.textPosition.start,
                      menu.data.textPosition.end,
                      newTag
                    );

                    editor.setValue(newValue);
                    const position = model.getPositionAt(
                      menu.data.textPosition.start
                    );
                    editor.setPosition(position);

                    setMenu({
                      type: "image",
                      data: {
                        id,
                        textPosition: {
                          start: menu.data.textPosition.start,
                          end: menu.data.textPosition.start + newTag.length,
                        },
                      },
                    });

                    const startPosition = model.getPositionAt(
                      menu.data.textPosition.start
                    );
                    const endPosition = model.getPositionAt(
                      menu.data.textPosition.start + newTag.length
                    );

                    editorStateRef.current.decorations = editor.deltaDecorations(
                      editorStateRef.current.decorations,
                      [
                        {
                          range: new MonacoRange(
                            startPosition.lineNumber,
                            startPosition.column,
                            endPosition.lineNumber,
                            endPosition.column
                          ),
                          options: {
                            inlineClassName: ".active-image-component",
                          },
                        },
                      ]
                    );
                    setShowMediaLibrary(false);
                    setTimeout(() => editor.focus());
                  }}
                />
              ) : null}
            </SideMenu>,
            sideBarRef.current
          )
        : null}
      {showMediaLibrary2 ? (
        <SelectLibraryImageModal
          close={() => setShowMediaLibrary2(false)}
          onSelect={(id) => {
            const editor = ref.current?.editor;
            if (!editor) return;
            setShowMediaLibrary2(false);
            insertImageIntoEditor(editor, id);
            setTimeout(() => editor.focus());
          }}
        />
      ) : null}
    </Container>
  );
};
