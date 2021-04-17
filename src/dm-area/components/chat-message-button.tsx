import * as React from "react";
import styled from "@emotion/styled/macro";
import { useMessageAddMutation } from "../../chat/message-add-mutation";
import { TemplateContext } from "./html-container";
import { Button, ButtonGroup, IconButton } from "@chakra-ui/button";
import { ChakraIcon } from "../../feather-icons";
import {
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from "@chakra-ui/popover";
import { button, useControls, useCreateStore } from "leva";
import { Portal } from "@chakra-ui/portal";
import { ThemedLevaPanel } from "../../themed-leva-panel";

export const StyledChatMessageButton = styled.button`
  all: unset;
  cursor: pointer;
  background: white;
  border-radius: 3px;
  border: 1px solid #d1d1d1;
  padding-left: 4px;
  padding-top: 2px;
  padding-bottom: 2px;
  padding-right: 4px;

  &:hover {
    background: #d1d1d1;
  }
`;

type ComplexOption = {
  value: number;
  min: number | undefined;
  max: number | undefined;
  step: number | undefined;
  label: string | undefined;
};

const tryParseJsonSafe = (value: string): string | ComplexOption => {
  try {
    const values = JSON.parse(value);

    return {
      value: values.value ?? 0,
      min: values.min ?? undefined,
      max: values.max ?? undefined,
      step: values.step ?? 1,
      label: values.label ?? undefined,
    };
  } catch (_) {
    return value;
  }
};

const getVariableProps = (props: { [key: string]: any }) => {
  return Object.entries(props)
    .filter(
      ([key, value]) => key.startsWith("var-") && typeof value === "string"
    )
    .map(([name, value]) => ({
      name: name.replace("var-", ""),
      value: tryParseJsonSafe(value),
    }));
};

export const ChatMessageButton: React.FC<{
  message?: string;
  templateId?: string;
  [key: string]: any;
}> = ({ children, templateId, ...props }) => {
  const templateMap = React.useContext(TemplateContext);
  let message = props.message;

  const controls = new Map<string, ComplexOption>();

  if (templateId) {
    const variables = getVariableProps(props);
    message = templateMap.get(templateId);
    if (!message) {
      message = "ERROR: Cannot find template";
    } else {
      for (const { name, value } of variables) {
        if (typeof value !== "string") {
          controls.set(name, value);
        } else {
          message = message.replace(new RegExp(`{{${name}}}`, "g"), value);
        }
      }
    }
  } else if (!message) {
    message = "ERROR: Cannot find template";
  }

  if (controls.size === 0) {
    return (
      <SimpleChatMessageButton message={message}>
        {children}
      </SimpleChatMessageButton>
    );
  }

  return (
    <ComplexChatMessageButton message={message} controls={controls}>
      {children}
    </ComplexChatMessageButton>
  );
};

const SimpleChatMessageButton = (props: {
  message: string;
  children?: React.ReactNode;
}) => {
  const messageAdd = useMessageAddMutation();

  return (
    <Button
      size="xs"
      isAttached
      variant="outline"
      onClick={() => {
        if (!props.message) {
          return;
        }
        messageAdd({ rawContent: props.message });
      }}
    >
      {props.children}
    </Button>
  );
};

const ComplexChatMessageButton = (props: {
  message: string;
  controls: Map<string, ComplexOption>;
  children?: React.ReactNode;
}) => {
  const messageAdd = useMessageAddMutation();

  const store = useCreateStore();

  const stateRef = React.useRef({} as Record<string, any>);

  const [state] = useControls(
    () =>
      Object.fromEntries([
        ...Array.from(props.controls),
        [
          "Roll with Modification",
          button(() => {
            let msgWithContent = props.message;
            for (const [name] of props.controls.entries()) {
              const defaultValue = String(stateRef.current[name] ?? 0);
              msgWithContent = msgWithContent.replace(
                new RegExp(`{{${name}}}`, "g"),
                defaultValue
              );
            }

            messageAdd({ rawContent: msgWithContent });
          }),
        ] as any,
      ]),
    { store }
  );

  React.useEffect(() => {
    stateRef.current = state;
  });

  return (
    <ButtonGroup size="xs" isAttached variant="outline">
      <Button
        onClick={() => {
          if (!props.message) {
            return;
          }
          let msgWithContent = props.message;
          for (const [name, value] of props.controls.entries()) {
            const defaultValue = String(value.value ?? 0);
            msgWithContent = msgWithContent.replace(
              new RegExp(`{{${name}}}`, "g"),
              defaultValue
            );
          }

          messageAdd({ rawContent: msgWithContent });
        }}
      >
        {props.children}
      </Button>
      <Popover placement="right">
        <PopoverTrigger>
          <IconButton aria-label="Add to friends" icon={<ChakraIcon.Right />} />
        </PopoverTrigger>
        <Portal>
          <PopoverContent maxWidth={200}>
            <PopoverArrow />
            <ThemedLevaPanel
              fill={true}
              flat={true}
              store={store}
              titleBar={false}
              oneLineLabels
              hideCopyButton
            />
          </PopoverContent>
        </Portal>
      </Popover>
    </ButtonGroup>
  );
};
