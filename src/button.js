import styled from "@emotion/styled/macro";

const ButtonBase = styled.button`
  cursor: pointer;
  border: none;
  align-items: center;
  border-radius: 4px;
  display: inline-flex;
  font-size: ${p => (p.big ? `24px` : `18px`)};
  font-weight: 700;
  line-height: 1.25;
  padding: ${p => (p.big ? `1.5rem 2rem` : `1rem 1.5rem`)};
  width: ${p => (p.fullWidth ? "100%" : null)};
  > svg:first-of-type {
    margin-right: ${p => (p.iconOnly ? null : `1rem`)};
  }
  > svg:last-child {
    margin-left: ${p => (p.iconOnly ? null : `1rem`)};
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

export const Tertiary = styled(ButtonBase)`
  background-color: transparent;
  color: #627d98;

  &:hover {
    background-color: #f0f4f8;
  }
`;
