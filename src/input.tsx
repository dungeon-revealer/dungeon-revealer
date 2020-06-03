import React from "react";
import styled from "@emotion/styled/macro";

const InputInner = styled.input`
  border: none;
  box-shadow: rgba(22, 23, 26, 0.15) 0px 0px 5px;

  width: 100%;

  padding-top: 12px;
  padding-bottom: 12px;
  padding-left: 12px;
  padding-right: 12px;

  font-size: 16px;

  border-radius: 8px;

  ::placeholder {
    color: #b3bbc3;
  }

  outline: none;

  &:focus,
  &:hover {
    box-shadow: rgba(22, 23, 26, 0.3) 0px 0px 5px;
  }
`;

export const Input: React.FC<React.ComponentProps<typeof InputInner>> = ({
  onKeyDown,
  ...props
}) => {
  return (
    <InputInner
      onKeyDown={(ev) => {
        if (ev.key !== "Escape") ev.stopPropagation();
        if (onKeyDown) onKeyDown(ev);
      }}
      {...props}
    />
  );
};

const InputGroupContainer = styled.div``;

const InputError = styled.div`
  padding-top: 4px;
  color: #ba2525;
  font-size: 12px;
  height: 12px;
`;

export const InputGroup: React.FC<
  React.ComponentProps<typeof Input> & { error: string | null }
> = ({ error, ...props }) => {
  return (
    <InputGroupContainer>
      <Input {...props} />
      <InputError>{error}</InputError>
    </InputGroupContainer>
  );
};
