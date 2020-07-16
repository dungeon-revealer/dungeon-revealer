import styled from "@emotion/styled/macro";
import * as BButton from "./button";

type HorizontalNavigationButtonProps = React.ComponentProps<
  typeof BButton.Tertiary
> & { isActive: boolean };

export const Group = styled.div`
  display: flex;
`;

export const Button = styled(BButton.Tertiary)<HorizontalNavigationButtonProps>`
  border-right: none;
  border: 1px solid rgb(203, 210, 217);
  white-space: nowrap;

  background-color: ${(p) => (p.isActive ? "#044e54" : null)};
  color: ${(p) => (p.isActive ? "#fff" : null)};
  border-color: ${(p) => (p.isActive ? "#044e54" : null)};

  &:hover {
    background-color: ${(p) => (p.isActive ? "#044e54" : null)};
  }

  &:first-of-type {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 0;
  }

  &:not(:last-child):not(:first-of-type) {
    border-radius: unset;
    border-right: none;
  }

  &:last-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-right: 1px solid rgb(203, 210, 217);
  }
`;
