import * as React from "react";
import styled from "@emotion/styled/macro";

import {
  Button,
  ButtonGroup,
  IconButton,
  Portal,
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from "@chakra-ui/react";
import { button, useControls, useCreateStore } from "leva";
import { ThemedLevaPanel } from "../../themed-leva-panel";
import { useMessageAddMutation } from "../../chat/message-add-mutation";
import { ChakraIcon } from "../../feather-icons";
import { TemplateContext } from "./html-container";

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
  min?: number | undefined;
  max?: number | undefined;
  step: number | undefined;
  label?: string | undefined;
};

const tryParseJsonSafe = (value: string): null | ComplexOption => {
  try {
    const values = JSON.parse(value);
    return {
      value: values.value ?? 0,
      min: values.min ?? -10,
      max: values.max ?? 10,
      step: values.step ?? 1,
      label: values.label ?? undefined,
    };
  } catch (_) {
    return null;
  }
};

const getVariableProps = (props: { [key: string]: any }) => {
  return Object.entries(props)
    .filter(
      ([key, value]) => key.startsWith("var-") && typeof value === "string"
    )
    .map(([name, value]) => ({
      name: name.replace("var-", ""),
      value,
    }));
};

type VariablesMap = Map<string, string>;

export const ChatMessageButton: React.FC<{
  message?: string;
  templateId?: string;
  [key: string]: any;
}> = ({ children, templateId, ...props }) => {
  const templateMap = React.useContext(TemplateContext);
  let message = props.message;

  const controls = new Map<string, ComplexOption>();
  const variables: VariablesMap = new Map();

  if (templateId) {
    const template = templateMap.get(templateId);
    if (template == null) {
      message = "ERROR: Cannot find template";
    } else {
      for (const [name, variable] of template.variables.entries()) {
        if (variable.value.type === "plainAttributeValue") {
          const maybeJSONValue = tryParseJsonSafe(variable.value.value);
          if (maybeJSONValue) {
            controls.set(name, maybeJSONValue);
          }
        } else if (variable.value.type === "stringAttributeValue") {
          variables.set(name, variable.value.value);
        }
      }
      message = template.content;

      const replaceVariables = getVariableProps(props);

      for (const { name, value } of replaceVariables) {
        message = message.replace(new RegExp(`{{${name}}}`, "g"), value);
      }

      console.log(template);
    }
  } else if (!message) {
    message = "ERROR: Cannot find template";
  }

  if (controls.size === 0) {
    return (
      <SimpleChatMessageButton message={message} variables={variables}>
        {children}
      </SimpleChatMessageButton>
    );
  }

  return (
    <ComplexChatMessageButton
      message={message}
      controls={controls}
      variables={variables}
    >
      {children}
    </ComplexChatMessageButton>
  );
};

const SimpleChatMessageButton = (props: {
  message: string;
  children?: React.ReactNode;
  variables: VariablesMap;
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
        messageAdd({
          rawContent: props.message,
          variables: JSON.stringify(
            Object.fromEntries(props.variables.entries())
          ),
        });
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
  variables: VariablesMap;
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
            messageAdd({
              rawContent: props.message,
              variables: JSON.stringify({
                ...Object.fromEntries(props.variables.entries()),
                ...stateRef.current,
              }),
            });
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
          messageAdd({
            rawContent: props.message,
            variables: JSON.stringify(
              Object.fromEntries([
                ...props.variables.entries(),
                ...Array.from(
                  props.controls.entries()
                ).map(([name, option]) => [name, option.value]),
              ])
            ),
          });
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
