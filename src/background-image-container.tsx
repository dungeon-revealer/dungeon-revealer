import React from "react";
import styled from "@emotion/styled/macro";
import { buildUrl } from "./public-url";

export const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;

  background-image: url("${buildUrl("/images/DungeonEntranceMedium.jpg")}");
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
  background-size: cover;
`;

const Inner = styled.div`
  min-height: 40vh;
  padding-left: 32px;
  padding-right: 32px;
  max-width: 500px;
`;

export const BackgroundImageContainer: React.FC<{}> = ({ children }) => {
  return (
    <Container>
      <Inner>{children}</Inner>
    </Container>
  );
};
