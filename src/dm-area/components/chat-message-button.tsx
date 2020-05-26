import * as React from "react";
import styled from "@emotion/styled/macro";
import { useMessageAddMutation } from "../../chat/message-add-mutation";

const StyledChatMessageButton = styled.button`
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

export const ChatMessageButton: React.FC<{
  message?: string;
}> = ({ children, message }) => {
  const messageAdd = useMessageAddMutation();

  return (
    <StyledChatMessageButton
      onClick={() => {
        if (!message) return;
        messageAdd({ rawContent: message });
      }}
    >
      {children}
    </StyledChatMessageButton>
  );
};
