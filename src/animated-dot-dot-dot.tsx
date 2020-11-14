import * as React from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled/macro";

const blink = keyframes`
  50% {color: transparent;}
`;

const Dot = styled.span`
  animation: 1s ${blink} infinite;
  &:nth-of-type(1) {
    animation-delay: 0ms;
  }
  &:nth-of-type(2) {
    animation-delay: 250ms;
  }
  &:nth-of-type(3) {
    animation-delay: 500ms;
  }
`;

export const AnimatedDotDotDot = () => {
  return (
    <span>
      <Dot>.</Dot>
      <Dot>.</Dot>
      <Dot>.</Dot>
    </span>
  );
};
