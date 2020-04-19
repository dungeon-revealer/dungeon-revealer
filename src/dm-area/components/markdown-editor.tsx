import React from "react";
import ReactMde, { commands as ReactMdeCommands, Command } from "react-mde";
import * as Button from "../../button";
import styled from "@emotion/styled/macro";
import { CommandGroup, TextRange } from "react-mde/lib/definitions/types";
import { sendRequest, ISendRequestTask } from "../../http-request";
import { buildApiUrl } from "../../public-url";
import { useOvermind } from "../../hooks/use-overmind";
import { SelectLibrarayImageModal } from "./select-library-image-modal";
import { parseDOM } from "htmlparser2";

const selectString = ({
  text,
  needle,
}: {
  text: string;
  needle: string;
}): TextRange => {
  const index = text.indexOf(needle);
  if (index === -1) return { start: text.length, end: text.length };
  return {
    start: index,
    end: index + needle.length,
  };
};

const useImageCommand: (opts: {
  uploadFile: (file: File) => Promise<string | null>;
}) => [Command, React.ReactNode] = ({ uploadFile }) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const command = React.useMemo<Command>(() => {
    return {
      name: "image",
      buttonProps: { "aria-label": "Add image" },
      execute: (_, api) => {
        stateRef.current.onSelectImage = (file: File) => {
          const placeholderTemplate = `[Uploading ${file.name}...]`;
          const state = api.getState();

          // always add image add the end.
          api.setSelectionRange({
            start: state.text.length,
            end: state.text.length,
          });
          api.replaceSelection(placeholderTemplate);

          // switch back to previous selection.
          api.setSelectionRange(state.selection);

          uploadFile(file).then((id) => {
            if (!stateRef.current.isMounted) return;
            const state = api.getState();

            const content = id
              ? `<Image id="${id}" />`
              : `[Uploading ${file.name} failed.]`;

            // replace placeholder string
            const range = selectString({
              text: state.text,
              needle: placeholderTemplate,
            });

            api.setSelectionRange({
              start: range.start,
              end: range.end,
            });

            api.replaceSelection(content);

            // switch back to previous selection.
            api.setSelectionRange(state.selection);
          });
        };
        fileInputRef.current?.click();
      },
    };
  }, []);

  const element = React.useMemo<React.ReactNode>(() => {
    return (
      <input
        type="file"
        style={{ display: "none" }}
        ref={fileInputRef}
        accept=".jpeg,.jpg,.svg,.png"
        onChange={(ev) => {
          if (!ev.target.files) {
            return;
          }
          const file: File | null = ev.target.files[0] || null;
          if (!file) {
            return;
          }
          stateRef.current.onSelectImage?.(file);
          ev.target.value = "";
        }}
      />
    );
  }, []);

  return [command, element];
};

const Container = styled.div`
  position: relative;
  display: flex;
  height: 100%;
  width: 100%;
`;

const ReactMdeStyled = styled(ReactMde)`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  border: none;

  textarea {
    line-height: 16px;
  }

  .mde-textarea-wrapper {
    height: 100%;
  }
  .mde-header {
    z-index: 1;
  }
  .mde-header + div {
    height: 100%;
  }

  .grip {
    display: none;
  }

  textarea {
    outline: none;
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
  textArea: HTMLTextAreaElement
): { id: string; position: { start: number; end: number } } | null => {
  const IMAGE_START_TAG = "<Image";

  // check whether cursor is inside a image definition
  let characterBeforeCounter = 0;
  let startIndex = -1;

  while (characterBeforeCounter <= 100) {
    const index = textArea.selectionEnd - characterBeforeCounter;
    if (textArea.value[index] === "<") {
      if (
        textArea.value.substr(index, IMAGE_START_TAG.length) === IMAGE_START_TAG
      ) {
        startIndex = index;
      }
      break;
    } else if (textArea.value[index] === ">") {
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
    const index = textArea.selectionEnd + characterAfterCounter;

    if (textArea.value[index] === "/" && textArea.value[index + 1] === ">") {
      endIndex = index + 2;
      break;
    }

    characterAfterCounter = characterAfterCounter + 1;
  }

  if (endIndex === -1) {
    return null;
  }

  const part = textArea.value.substring(startIndex, endIndex);

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
  position: absolute;
  padding: 12px;
  left: calc(100% + 12px);
  width: 300px;
  background: white;
  border-left: 1px solid lightgrey;
  border-radius: 5px;
`;

const SideMenuImage = styled.img`
  max-width: 100%;
  max-height: 150px;
  display: block;
  margin-left: auto;
  margin-right: auto;
`;

export const MarkdownEditor: React.FC<{
  value: string;
  onChange: (input: string) => void;
}> = ({ value, onChange }) => {
  const uploadTaskRef = React.useRef<ISendRequestTask | null>(null);
  const { state } = useOvermind();

  const uploadFile = React.useCallback((file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const task = (uploadTaskRef.current = sendRequest({
      url: buildApiUrl("/images"),
      method: "POST",
      body: formData,
      headers: {
        authorization: state.sessionStore.accessToken,
      },
    }));

    return task.done.then((result) => {
      if (result.type !== "success") return null;
      const json = JSON.parse(result.data as string);
      return json.data.id;
    });
  }, []);

  const [imageCommand, uploadImageNode] = useImageCommand({
    uploadFile,
  });

  React.useEffect(() => () => uploadTaskRef.current?.abort(), []);

  const commands = React.useMemo<CommandGroup[]>(
    () => [
      {
        commands: [
          ReactMdeCommands.boldCommand,
          ReactMdeCommands.italicCommand,
          ReactMdeCommands.strikeThroughCommand,
          ReactMdeCommands.orderedListCommand,
          ReactMdeCommands.unorderedListCommand,
          ReactMdeCommands.quoteCommand,
          imageCommand,
        ],
      },
    ],
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
  const [showMediaLibrary, setShowMediaLibrary] = React.useState(false);

  const ref = React.useRef<ReactMde | null>(null);

  React.useEffect(() => {
    const handler = () => {
      if (ref.current?.textAreaRef) {
        const textArea = ref.current?.textAreaRef;

        const imageSelectionRange = getMarkdownImageSelectionRange(textArea);
        if (imageSelectionRange) {
          setMenu({
            type: "image",
            data: {
              id: imageSelectionRange.id,
              textPosition: imageSelectionRange.position,
            },
          });
        } else {
          setMenu(null);
        }
      }
    };

    ref.current?.textAreaRef.addEventListener("mouseup", handler);
    ref.current?.textAreaRef.addEventListener("keyup", handler);

    return () => {
      ref.current?.textAreaRef.removeEventListener("mouseup", handler);
      ref.current?.textAreaRef.removeEventListener("keyup", handler);
    };
  }, []);

  return (
    <Container>
      <ReactMdeStyled
        ref={ref}
        commands={commands}
        value={value}
        onChange={onChange}
        // @ts-ignore
        minEditorHeight="100%"
        disablePreview
      />
      {uploadImageNode}
      {menu ? (
        <SideMenu>
          <b>Linked Image</b>
          <SideMenuImage src={buildApiUrl(`/images/${menu.data.id}`)} />
          <Button.Primary small onClick={() => setShowMediaLibrary(true)}>
            Change
          </Button.Primary>
          {showMediaLibrary ? (
            <SelectLibrarayImageModal
              close={() => setShowMediaLibrary(false)}
              onSelect={(id) => {
                if (!ref.current?.textAreaRef.value) return;
                const newTag = `<Image id="${id}" />`;
                const newValue = replaceRange(
                  ref.current.textAreaRef.value,
                  menu.data.textPosition.start,
                  menu.data.textPosition.end,
                  newTag
                );

                onChange(newValue);
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
                setShowMediaLibrary(false);
              }}
            />
          ) : null}
        </SideMenu>
      ) : null}
    </Container>
  );
};
