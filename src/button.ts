import styled from "@emotion/styled/macro";
import { lighten } from "polished";

type ButtonBaseProps = {
  disabled?: boolean;
  big?: boolean;
  small?: boolean;
  iconOnly?: boolean;
  fullWidth?: boolean;
};

const ButtonBase = styled.button<ButtonBaseProps>`
  cursor: pointer;
  border: none;
  align-items: center;
  border-radius: 4px;
  display: inline-flex;
  font-size: ${(p) => (p.big ? `24px` : `18px`)};
  font-weight: 700;
  line-height: 1.25;
  padding: ${(p) =>
    p.big ? `1rem 2rem` : p.small ? `0.5rem .75rem` : `1rem 1.5rem`};
  width: ${(p) => (p.fullWidth ? "100%" : null)};
  height: ${(p) => (p.big ? `60px` : p.small ? `32px` : `54px`)};
  font-size: ${(p) => (p.small ? `12px` : undefined)};

  > svg:first-of-type:not(:last-child) {
    margin-left: ${(p) => (p.iconOnly ? null : p.small ? `-4px` : `-8px`)};
  }

  > svg + span {
    margin-left: ${(p) => (p.iconOnly ? null : p.small ? `6px` : `12px`)};
  }
  > span + svg {
    margin-left: ${(p) => (p.iconOnly ? null : p.small ? `6px` : `12px`)};
  }
`;

export const Primary = styled(ButtonBase)`
  border: none;
  background-color: #044e54;
  color: white;

  &:focus,
  &:hover {
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
    background-color: #0a6c74;
  }
`;

export const Secondary = styled(ButtonBase)`
  background-color: #d9e2ec;
  color: black;

  &:hover {
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  }
`;

export const Tertiary = styled(ButtonBase)<
  ButtonBaseProps & {
    danger?: boolean;
  }
>`
  background-color: transparent;
  color: ${(p) =>
    p.disabled ? lighten(0.3, "#627d98") : p.danger ? "#f44336" : "#627d98"};
  cursor: ${(p) => (p.disabled ? "inherit" : null)};

  &:hover {
    background-color: ${(p) => (p.disabled ? null : "#f0f4f8")};
  }
`;
