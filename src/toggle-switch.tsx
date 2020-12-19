import React from "react";
import styled from "@emotion/styled/macro";

const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;

  &:focus-within {
    outline: -webkit-focus-ring-color auto 5px;
  }

  > input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  > input:checked + div {
    background-color: #044e54;
  }

  > input:checked + div:before {
    -webkit-transform: translateX(26px);
    -ms-transform: translateX(26px);
    transform: translateX(26px);
  }
`;

const Slider = styled.div`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: 0.4s;
  transition: 0.4s;

  border-radius: 34px;

  &:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    -webkit-transition: 0.4s;
    transition: 0.4s;

    border-radius: 50%;
  }
`;

export const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ checked, onChange }) => {
  return (
    <Switch>
      <input
        type="checkbox"
        checked={checked}
        onChange={(ev) => {
          onChange(ev.target.checked);
        }}
      />
      <Slider />
    </Switch>
  );
};
