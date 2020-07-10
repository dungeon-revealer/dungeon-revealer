import * as React from "react";
import styled from "@emotion/styled/macro";
import { useMessageAddMutation } from "../../chat/message-add-mutation";
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

const getVariableProps = (props: { [key: string]: any }) => {
  return Object.entries(props)
    .filter(
      ([key, value]) => key.startsWith("var-") && typeof value === "string"
    )
    .map(([name, value]) => ({
      name: name.replace("var-", ""),
      value: value as string,
    }));
};

export const ChatMessageButton: React.FC<{
  message?: string;
  templateId?: string;
  [key: string]: any;
}> = ({ children, message, templateId, ...props }) => {
  const templateMap = React.useContext(TemplateContext);

  const messageAdd = useMessageAddMutation();

  let displayText: React.ReactNode = children;
  if (templateId) {
    const variables = getVariableProps(props);
    message = templateMap.get(templateId);
    for (const { name, value } of variables) {
      message = message?.replace(new RegExp(`{{${name}}}`, "g"), value);
    }
  }
  return (
    <StyledChatMessageButton
      onClick={() => {
        if (!message) return;
        messageAdd({ rawContent: message });
      }}
    >
      {displayText}
    </StyledChatMessageButton>
  );
};
