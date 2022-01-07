import React from "react";
import * as ReactDom from "react-dom";
import styled from "@emotion/styled/macro";
import { parseDocument } from "htmlparser2";
import MonacoEditor, { useMonaco, Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import { Flex, Box } from "@chakra-ui/react";
import * as Button from "../../button";
import { sendRequest, ISendRequestTask } from "../../http-request";
import { buildApiUrl } from "../../public-url";
import { SelectLibraryImageModal } from "./select-library-image-modal";
import { transparentize } from "polished";
import * as Icon from "../../feather-icons";
import { useSelectFileDialog } from "../../hooks/use-select-file-dialog";
import { useAccessToken } from "../../hooks/use-access-token";
import graphql from "babel-plugin-relay/macro";
import { useMutation, useQuery } from "relay-hooks";
import { markdownEditor_noteCreateMutation } from "./__generated__/markdownEditor_noteCreateMutation.graphql";
import { markdownEditor_asideNoteQuery } from "./__generated__/markdownEditor_asideNoteQuery.graphql";
import { useNoteWindowActions } from "../token-info-aside";
import { useWindowContext } from "../token-info-aside/token-info-aside";
import { useCurrent } from "../../hooks/use-current";
import { useShowSelectNoteModal } from "../select-note-modal";
import { HtmlContainer } from "./html-container";

const insertImageIntoEditor = (
  monaco: Monaco,
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  id: string
) => {
  const model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !editor || !selection) return;

  const placeholderTemplate = `<Image id="${id}" />`;

  editor.executeEdits("", [
    {
      range: new monaco.Range(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn
      ),
      text: placeholderTemplate,
    },
  ]);
};

const wrapMarkdownSelection = (
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  wrapper: { left: string; right: string },
  replace: { regexp: RegExp; replace: string }
) => {
  const model = editor?.getModel();
  const selection = editor?.getSelection();
  if (!model || !editor || !selection) return;
  const selectedText = model.getValueInRange(selection);
  if (
    selectedText.trim().startsWith(wrapper.left) &&
    selectedText.trim().endsWith(wrapper.right)
  ) {
    editor.executeEdits("", [
      {
        range: selection,
        text: model
          .getValueInRange(selection)
          .replace(replace.regexp, replace.replace),
      },
    ]);
  } else {
    editor.executeEdits("", [
      {
        range: selection,
        text: `${wrapper.left}${model.getValueInRange(selection)}${
          wrapper.right
        }`,
      },
    ]);
  }
  editor.focus();
};

type MdList = { prefix: string; regexp: RegExp };

const listKinds: { [listKind: string]: MdList } = {
  check: {
    prefix: "- [x] ",
    regexp: /^(\s*)(\-\s+\[[\sx]{0,1}\]\s)(.*)$/,
  },
  unordered: {
    prefix: "- ",
    // (whitespace)(prefix)(content)
    regexp: /^(\s*)(\-\s)(.*)$/,
  },
  ordered: {
    prefix: "1. ",
    regexp: /^(\s*)([0-9]+\.\s)(.*)$/,
  },
  quote: {
    prefix: "> ",
    regexp: /^(\s*)(\>\s)(.*)$/,
  },
};

const toggleMarkdownList = (
  monaco: Monaco,
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  listKind: MdList
) => {
  const model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !editor || !selection || !monaco) return;

  const leftWhitespaceRegexp = /^(\s*)(.*)$/;

  const textList = (text: string) => {
    let kind: keyof typeof listKinds;
    for (kind in listKinds) {
      let match = text.match(listKinds[kind].regexp);
      if (match) return { text, match, list: listKinds[kind] };
    }
    return null;
  };

  const isMultiline = selection.startLineNumber !== selection.endLineNumber;

  let applyListMultiline = false;
  if (isMultiline) {
    applyListMultiline =
      textList(model.getLineContent(selection.startLineNumber))?.list.prefix !==
      listKind.prefix;
  }

  for (
    let index = selection.startLineNumber;
    index <= selection.endLineNumber;
    index++
  ) {
    let selectedText = model.getLineContent(index);
    const length = selectedText.length;
    let lineList = textList(selectedText);
    let newText = selectedText;
    if (isMultiline) {
      if (applyListMultiline) {
        if (lineList) {
          newText = lineList.match[1] + listKind.prefix + lineList.match[3];
        } else {
          let spaceMatch = selectedText.match(leftWhitespaceRegexp);
          if (spaceMatch)
            newText = spaceMatch[1] + listKind.prefix + spaceMatch[2];
        }
      } else {
        if (lineList) {
          newText = lineList.match[1] + lineList.match[3];
        } else {
          let spaceMatch = selectedText.match(leftWhitespaceRegexp);
          if (spaceMatch) newText = spaceMatch[1] + spaceMatch[2];
        }
      }
    } else {
      if (lineList) {
        if (lineList.list.prefix == listKind.prefix) {
          newText = lineList.match[1] + lineList.match[3];
        } else {
          newText = lineList.match[1] + listKind.prefix + lineList.match[3];
        }
      } else {
        let spaceMatch = selectedText.match(leftWhitespaceRegexp);
        if (spaceMatch)
          newText = spaceMatch[1] + listKind.prefix + spaceMatch[2];
      }
    }

    if (newText !== selectedText) {
      editor.executeEdits("", [
        {
          range: new monaco.Range(index, 1, index, length + 1),
          text: newText,
        },
      ]);
    }
    editor.setPosition(
      new monaco.Position(
        selection.startLineNumber,
        model.getLineContent(selection.startLineNumber).length +
          1 +
          listKind.prefix.length +
          1
      )
    );
    editor.focus();
  }
};

const useImageCommand: (opts: {
  monaco: Monaco | null;
  uploadFile: (file: File) => Promise<string | null>;
  editorReference: React.RefObject<monacoEditor.editor.IStandaloneCodeEditor>;
}) => [React.ReactNode, () => void] = ({
  monaco,
  uploadFile,
  editorReference,
}) => {
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
      const editor = editorReference.current;
      const model = editor?.getModel();
      const selection = editor?.getSelection();
      if (!model || !editor || !selection || !monaco) return;

      const placeholderTemplate = `[Uploading ${file.name}...]`;

      editor.executeEdits("", [
        {
          range: new monaco.Range(
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
        const editor = editorReference.current;
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
              range: new monaco.Range(line, column, line, column),
              text: `\n\n${content}`,
            },
          ]);
        } else {
          const start = model.getPositionAt(index);
          const end = model.getPositionAt(index + placeholderTemplate.length);
          editor.executeEdits("", [
            {
              range: new monaco.Range(
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
  }, [showFileDialog, monaco]);

  return [reactTreeNode, onClick];
};

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;

  .active-image-component {
    background-color: ${transparentize(0.5, "pink")};
  }
`;

/**
 * Takes a string that includes a single HTML element and invokes the callback with the corresponding AST.
 */
const parseTagAstFromHtmlTagString = (input: string) => {
  const result = parseDocument(input, {
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
  });

  return result.children.length ? result.children[0] : null;
};

const getParseLinkRegex = () => /\[([^\]]*)\]\(([^)]*)\)/;

// @TODO: optimize this function
const getMarkdownLinkSelectionRange = (
  column: number,
  text: string
): {
  type: "link";
  id: string;
  text: string;
  position: { start: number; end: number };
} | null => {
  const LINK_START_CHAR = "[";

  // check whether cursor is inside a link definition
  let characterBeforeCounter = 0;

  while (characterBeforeCounter <= 300) {
    const index = column - characterBeforeCounter;
    if (text[index] === LINK_START_CHAR) {
      const part = text.substring(index);
      if (part.search(getParseLinkRegex()) === 0) {
        const match = part.match(getParseLinkRegex());
        if (match) {
          const start = index;
          const end = index + match[0].length - 1;
          if (column >= start && column <= end) {
            return {
              type: "link" as const,
              text: match[1],
              id: match[2],
              position: { start: index, end: index + match[0].length },
            };
          }
        }
      }
    }

    characterBeforeCounter = characterBeforeCounter + 1;
  }

  return null;
};

const getMarkdownImageSelectionRange = (
  column: number,
  text: string
): {
  type: "image";
  id: string;
  position: { start: number; end: number };
} | null => {
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
    type: "image" as const,
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

const MarkdownEditor_NoteCreateMutation = graphql`
  mutation markdownEditor_noteCreateMutation($input: NoteCreateInput!) {
    noteCreate(input: $input) {
      note {
        id
        documentId
      }
    }
  }
`;

const MarkdownEditor_AsideNoteQuery = graphql`
  query markdownEditor_asideNoteQuery($documentId: ID!) {
    asideNote: note(documentId: $documentId) {
      id
      documentId
      title
      contentPreview
    }
  }
`;

const AsideSelectNote: React.FC<{
  noteId: string;
  onSelect: (id: string) => void;
}> = (props) => {
  const actions = useNoteWindowActions();
  const windowId = useWindowContext();
  const [mutate, state] = useMutation<markdownEditor_noteCreateMutation>(
    MarkdownEditor_NoteCreateMutation,
    {
      variables: {
        input: {
          title: "New Note",
          content: "# New Note",
          isEntryPoint: false,
        },
      },
    }
  );

  const query = useQuery<markdownEditor_asideNoteQuery>(
    MarkdownEditor_AsideNoteQuery,
    {
      documentId: props.noteId,
    },
    {
      skip: !props.noteId,
    }
  );

  const [, dataProps] = useCurrent(
    query.data,
    !query.data && !query.error,
    300
  );

  const isValidNoteIdWithoutResult = props.noteId && !query.data?.asideNote;

  const [selectNoteModalNode, showSelectNoteModal] = useShowSelectNoteModal();

  const linkNote = () => showSelectNoteModal(props.onSelect);

  return (
    <>
      <SideMenuTitle>
        <Icon.Link boxSize="16px" style={{ marginBottom: "-2px" }} /> Linked
        Note
      </SideMenuTitle>
      {!props.noteId || isValidNoteIdWithoutResult ? (
        <>
          No Note selected.
          <br />
          <br />
          <Button.Primary small onClick={linkNote}>
            Link Note
          </Button.Primary>{" "}
          or{" "}
          <Button.Primary
            small
            onClick={() => {
              if (state.loading) {
                return;
              }
              mutate({
                onCompleted: (result) => {
                  props.onSelect(result.noteCreate.note.documentId);
                },
              });
            }}
          >
            Create Note
          </Button.Primary>
        </>
      ) : dataProps?.asideNote ? (
        <>
          <div style={{ marginBottom: 8 }}>
            <b>Title:</b> {dataProps.asideNote.title}
          </div>
          <div style={{ marginBottom: 8 }}>
            {dataProps.asideNote.contentPreview}
          </div>
          <div>
            <Button.Primary small style={{ marginRight: 8 }} onClick={linkNote}>
              Change linked Note
            </Button.Primary>
            <Button.Primary
              small
              onClick={() => {
                actions.showNoteInWindow(props.noteId, windowId);
              }}
            >
              Open
            </Button.Primary>
          </div>
        </>
      ) : null}
      {selectNoteModalNode}
    </>
  );
};

export const MarkdownEditor: React.FC<{
  value: string;
  onChange: (input: string) => void;
  sideBarRef: React.RefObject<HTMLElement>;
  editorOnResizeRef?: React.MutableRefObject<() => void>;
}> = ({ value, onChange, sideBarRef, editorOnResizeRef }) => {
  const monaco = useMonaco();
  const uploadTaskRef = React.useRef<ISendRequestTask | null>(null);
  const accessToken = useAccessToken();
  const [isSplitView, setIsSplitView] = React.useState(false);

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

  const ref = React.useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null
  );
  const editorStateRef = React.useRef({
    decorations: [] as string[],
  });

  const [uploadImageNode, onClickImageButton] = useImageCommand({
    uploadFile,
    editorReference: ref,
    monaco,
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

  const [menu, setMenu] = React.useState<
    | {
        type: "image";
        data: {
          id: string;
          textPosition: {
            start: number;
            end: number;
          };
        };
      }
    | {
        type: "link";
        data: {
          id: string;
          innerContent: string;
          textPosition: {
            start: number;
            end: number;
          };
        };
      }
    | null
  >(null);

  // TODO: Ideally we only have one showMediaLibrary state that is more complex

  // media library for changing the selection of an existing Image component
  const [showMediaLibrary, setShowMediaLibrary] = React.useState(false);

  // media library for inserting a new Image component
  const [showMediaLibrary2, setShowMediaLibrary2] = React.useState(false);
  const selectImageFromLibrary = React.useCallback(() => {
    setShowMediaLibrary2(true);
  }, []);

  const monacoRef = React.useRef(monaco);
  React.useEffect(() => {
    monacoRef.current = monaco;
  });
  return (
    <Container>
      <TextToolBar>
        <ToolBarButton
          title="Heading"
          onClick={() => {
            const editor = ref.current;
            const model = editor?.getModel();
            const selection = editor?.getSelection();
            if (
              !model ||
              !editor ||
              !selection ||
              !monaco ||
              selection.startLineNumber !== selection.endLineNumber
            )
              return;
            let selectedText = model.getLineContent(selection.startLineNumber);
            let result = selectedText.match(/^(#+)(.*)$/);
            let newText = `# ${selectedText.trimLeft()}`;
            if (result) {
              let headerLevel = (result[1].length + 1) % 5;
              newText = `${"#".repeat(headerLevel)}${result[2]}`;
            }
            editor.executeEdits("", [
              {
                range: new monaco.Range(
                  selection.startLineNumber,
                  1,
                  selection.startLineNumber,
                  selectedText.length + 1
                ),
                text: newText,
              },
            ]);
          }}
        >
          <Icon.Heading />
        </ToolBarButton>
        <ToolBarButton
          title="Bold"
          onClick={() => {
            const editor = ref.current;
            if (editor) {
              wrapMarkdownSelection(
                editor,
                { left: "**", right: "**" },
                { regexp: /\*\*/g, replace: "" }
              );
            }
          }}
        >
          <Icon.Bold boxSize="16px" />
        </ToolBarButton>
        <ToolBarButton
          title="Italicize"
          onClick={() => {
            const editor = ref.current;
            if (editor) {
              wrapMarkdownSelection(
                editor,
                { left: "_", right: "_" },
                { regexp: /_/g, replace: "" }
              );
            }
          }}
        >
          <Icon.Italic boxSize="16px" />
        </ToolBarButton>
        <ToolBarButton
          title="Strikethrough"
          onClick={() => {
            const editor = ref.current;
            if (editor) {
              wrapMarkdownSelection(
                editor,
                { left: "~~", right: "~~" },
                { regexp: /~~/g, replace: "" }
              );
            }
          }}
        >
          <Icon.Strikethrough />
        </ToolBarButton>
        <ToolBarButton
          title="Code"
          onClick={() => {
            const editor = ref.current;
            const model = editor?.getModel();
            let selection = editor?.getSelection();
            if (!model || !editor || !selection || !monaco) return;
            let multiline =
              selection.startLineNumber !== selection.endLineNumber;
            if (multiline) {
              if (
                selection.startLineNumber > 1 &&
                model.getLineContent(selection.startLineNumber - 1).trim() ===
                  "```" &&
                model.getLineContent(selection.endLineNumber + 1).trim() ===
                  "```"
              ) {
                let newRange = new monaco.Range(
                  selection.startLineNumber - 1,
                  1,
                  selection.endLineNumber + 1,
                  model.getLineContent(selection.endLineNumber + 1).length + 1
                );
                editor.setSelection(newRange);
                wrapMarkdownSelection(
                  editor,
                  { left: "```\n", right: "\n```" },
                  { regexp: /\n{0,1}\`\`\`\n{0,1}/g, replace: "" }
                );
              } else {
                wrapMarkdownSelection(
                  editor,
                  { left: "```\n", right: "\n```" },
                  { regexp: /\n{0,1}\`\`\`\n{0,1}/g, replace: "" }
                );
              }
            } else {
              wrapMarkdownSelection(
                editor,
                { left: "`", right: "`" },
                { regexp: /\`/g, replace: "" }
              );
            }
          }}
        >
          <Icon.Code />
        </ToolBarButton>
        <ToolBarButtonDropDown>
          <ToolBarButton
            title="Insert List"
            onClick={() => {
              if (monaco && ref.current)
                toggleMarkdownList(monaco, ref.current, listKinds.unordered);
            }}
          >
            <Icon.List boxSize="16px" />
          </ToolBarButton>
          <DropDownMenu data-menu>
            <DropDownMenuInner>
              <DropDownMenuItem
                onClick={() => {
                  if (monaco && ref.current)
                    toggleMarkdownList(
                      monaco,
                      ref.current,
                      listKinds.unordered
                    );
                }}
              >
                Unordered List
              </DropDownMenuItem>
              <DropDownMenuItem
                onClick={() => {
                  if (monaco && ref.current)
                    toggleMarkdownList(monaco, ref.current, listKinds.ordered);
                }}
              >
                Ordered List
              </DropDownMenuItem>
              <DropDownMenuItem
                onClick={() => {
                  if (monaco && ref.current)
                    toggleMarkdownList(monaco, ref.current, listKinds.check);
                }}
              >
                Check List
              </DropDownMenuItem>
            </DropDownMenuInner>
          </DropDownMenu>
        </ToolBarButtonDropDown>
        <ToolBarButton
          title="Quote"
          onClick={() => {
            if (monaco && ref.current)
              toggleMarkdownList(monaco, ref.current, listKinds.quote);
          }}
        >
          <Icon.Quote />
        </ToolBarButton>
        <ToolBarButtonDropDown>
          <ToolBarButton title="Insert Image" onClick={onClickImageButton}>
            <Icon.Image boxSize="16px" />
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
        <ToolBarButton
          title="Insert Link"
          onClick={() => {
            const editor = ref.current;
            if (editor) {
              wrapMarkdownSelection(
                editor,
                { left: "[", right: "]()" },
                { regexp: /\[(.*)\]\(.*\)/g, replace: "$1" }
              );
            }
          }}
        >
          <Icon.Link boxSize="16px" />
        </ToolBarButton>
        <ToolBarButton
          title="Dice macro"
          onClick={() => {
            const editor = ref.current;
            const model = editor?.getModel();
            const selection = editor?.getSelection();
            if (!model || !editor || !selection) return;

            let message = model.getValueInRange(selection);
            let wrapLeft = '<ChatMacro message="';
            if (!message) {
              wrapLeft +=
                "Chat message with dice rolls [1d20] makes [2d6] damage";
            }

            wrapMarkdownSelection(
              editor,
              { left: wrapLeft, right: '">\n  Button Text\n</ChatMacro>' },
              {
                regexp: /\<ChatMacro.*message="(.*)".*\<\/ChatMacro\>/gs,
                replace: "$1",
              }
            );
          }}
        >
          <Icon.Dice boxSize="16px" />
        </ToolBarButton>
        <ToolBarButton
          title="Insert Table"
          onClick={() => {
            const editor = ref.current;
            const model = editor?.getModel();
            const selection = editor?.getSelection();
            if (!model || !editor || !selection) return;

            if (model.getValueInRange(selection)) return;

            const tableTemplate = `| Header 1 | Header 2 | Header 3 |\n| :------: | :------: | :------: |\n|  entry 1 |  entry 2 |  entry 3 |`;

            editor.executeEdits("", [
              {
                range: selection,
                text: tableTemplate,
              },
            ]);
          }}
        >
          <Icon.Grid boxSize="16px" />
        </ToolBarButton>
        <ToolBarButton
          style={{ marginLeft: "auto" }}
          title="Toggle Split Mode"
          onClick={() => {
            setIsSplitView((isSplitView) => !isSplitView);
          }}
        >
          <Icon.Columns />
        </ToolBarButton>
      </TextToolBar>
      <Flex overflow="hidden" height="100%">
        <Box
          flex="1"
          position="relative"
          maxWidth={isSplitView ? "50%" : undefined}
        >
          <MonacoEditor
            value={value}
            onChange={(value) => value !== undefined && onChange(value)}
            language="markdown"
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              wordWrap: "on",
            }}
            onMount={(editor) => {
              ref.current = editor;
              if (editorOnResizeRef) {
                editorOnResizeRef.current = () => {
                  editor.layout();
                };
              }

              editor.onDidChangeCursorPosition((event) => {
                const text = editor.getValue();
                const model = editor.getModel();
                const monaco = monacoRef.current;
                if (!model || !monaco) return;

                const positionOffset = model.getOffsetAt(event.position);

                let selectionRange =
                  getMarkdownImageSelectionRange(positionOffset, text) ||
                  getMarkdownLinkSelectionRange(positionOffset, text);

                if (!selectionRange) {
                  editorStateRef.current.decorations = editor.deltaDecorations(
                    editorStateRef.current.decorations,
                    []
                  );
                  setMenu(null);
                  return;
                }

                const startPosition = model.getPositionAt(
                  selectionRange.position.start
                );
                const endPosition = model.getPositionAt(
                  selectionRange.position.end
                );
                editorStateRef.current.decorations = editor.deltaDecorations(
                  editorStateRef.current.decorations,
                  [
                    {
                      range: new monaco.Range(
                        startPosition.lineNumber,
                        startPosition.column,
                        endPosition.lineNumber,
                        endPosition.column
                      ),
                      options: { inlineClassName: ".active-image-component" },
                    },
                  ]
                );

                if (selectionRange.type === "image") {
                  setMenu({
                    type: selectionRange.type,
                    data: {
                      id: selectionRange.id,
                      textPosition: {
                        ...selectionRange.position,
                      },
                    },
                  });
                } else {
                  setMenu({
                    type: selectionRange.type,
                    data: {
                      id: selectionRange.id,
                      innerContent: selectionRange.text,
                      textPosition: {
                        ...selectionRange.position,
                      },
                    },
                  });
                }
              });
            }}
          />
        </Box>
        {isSplitView ? (
          <Box flex="1" overflowY="scroll" padding="2">
            <HtmlContainer markdown={value} />
          </Box>
        ) : null}
      </Flex>
      {uploadImageNode}
      {menu && sideBarRef.current
        ? ReactDom.createPortal(
            <SideMenu>
              {menu.type === "image" ? (
                <>
                  <SideMenuTitle>
                    <Icon.Link
                      boxSize="16px"
                      style={{ marginBottom: "-2px" }}
                    />{" "}
                    Linked Image
                  </SideMenuTitle>
                  <SideMenuImage src={buildApiUrl(`/images/${menu.data.id}`)} />
                  <Button.Primary
                    small
                    onClick={() => setShowMediaLibrary(true)}
                  >
                    Change
                  </Button.Primary>
                  {showMediaLibrary ? (
                    <SelectLibraryImageModal
                      close={() => setShowMediaLibrary(false)}
                      onSelect={(id) => {
                        if (!ref.current) return;
                        const editor = ref.current;
                        const model = editor.getModel();
                        if (!model || !monaco) return;
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

                        editorStateRef.current.decorations =
                          editor.deltaDecorations(
                            editorStateRef.current.decorations,
                            [
                              {
                                range: new monaco.Range(
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
                </>
              ) : menu.type === "link" ? (
                <AsideSelectNote
                  noteId={menu.data.id}
                  onSelect={(id) => {
                    if (!ref.current) return;
                    const editor = ref.current;
                    const model = editor.getModel();
                    if (!model || !monaco) return;
                    const value = editor.getValue();

                    const newTag = `[${menu.data.innerContent}](${id})`;
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
                      type: "link",
                      data: {
                        id,
                        innerContent: menu.data.innerContent,
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

                    editorStateRef.current.decorations =
                      editor.deltaDecorations(
                        editorStateRef.current.decorations,
                        [
                          {
                            range: new monaco.Range(
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
            const editor = ref.current;
            if (!editor || !monaco) return;
            setShowMediaLibrary2(false);
            insertImageIntoEditor(monaco, editor, id);
            setTimeout(() => editor.focus());
          }}
        />
      ) : null}
    </Container>
  );
};
