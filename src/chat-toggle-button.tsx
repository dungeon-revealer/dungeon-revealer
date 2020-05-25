import * as React from "react";
import styled from "@emotion/styled/macro";
import * as Icon from "./feather-icons";

const StyledChatToggleButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  height: 30px;
  width: 30px;
  background-color: white;
  z-index: 20;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  border: none;
`;

export const ChatToggleButton: React.FC<{
  onClick: React.ComponentProps<"button">["onClick"];
}> = ({ onClick }) => {
  return (
    <StyledChatToggleButton onClick={onClick}>
      <Icon.MessageCircleIcon height={20} width={20} />
    </StyledChatToggleButton>
  );
};
