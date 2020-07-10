import * as React from "react";
import styled from "@emotion/styled/macro";
import * as Icon from "./feather-icons";
import { darken } from "polished";

export const IconButton = styled.button`
  position: relative;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  height: 30px;
  width: 30px;
  background-color: white;
  z-index: 20;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: ${darken(0.1, "white")};
  }
`;

export const ButtonBadge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  height: 10px;
  width: 10px;
  border-radius: 50%;
  background-color: red;
`;

export const ChatToggleButton: React.FC<{
  hasUnreadMessages: boolean;
  onClick: React.ComponentProps<"button">["onClick"];
}> = ({ hasUnreadMessages, onClick }) => {
  return (
    <IconButton onClick={onClick}>
      <Icon.MessageCircleIcon height={20} width={20} />
      {hasUnreadMessages ? <ButtonBadge /> : null}
    </IconButton>
  );
};
