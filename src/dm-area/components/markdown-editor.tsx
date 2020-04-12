import React from "react";
import ReactMde, { commands as ReactMdeCommands, Command } from "react-mde";
import styled from "@emotion/styled/macro";
import { CommandGroup, TextRange } from "react-mde/lib/definitions/types";

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

          uploadFile(file).then((url) => {
            if (!stateRef.current.isMounted) return;
            const state = api.getState();

            const content = url
              ? `![${file.name}](${url})`
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

const ReactMdeStyled = styled(ReactMde)`
  display: flex;
  flex-direction: column;
  height: 100%;
  border: none;

  .mde-textarea-wrapper {
    height: 100%;
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

export const MarkdownEditor: React.FC<{
  value: string;
  onChange: (input: string) => void;
}> = ({ value, onChange }) => {
  const [imageCommand, uploadImageNode] = useImageCommand({
    uploadFile: (file: File) =>
      // TODO: uplaod to backend
      new Promise((res) => setTimeout(() => res("/uploads/image.jpeg"), 5000)),
  });

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

  return (
    <>
      <ReactMdeStyled
        commands={commands}
        value={value}
        onChange={onChange}
        // @ts-ignore
        minEditorHeight="100%"
        disablePreview
      />
      {uploadImageNode}
    </>
  );
};
