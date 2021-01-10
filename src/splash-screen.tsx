import React from "react";
import { BackgroundImageContainer } from "./background-image-container";
import { BrandLogoText } from "./brand-logo-text";
import styled from "@emotion/styled/macro";

const SplashScreenText = styled.div`
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: white;
`;

export const SplashScreen: React.FC<{ text?: string }> = ({ text = null }) => {
  return (
    <BackgroundImageContainer>
      <div>
        <BrandLogoText />
        <SplashScreenText>{text}</SplashScreenText>
      </div>
    </BackgroundImageContainer>
  );
};
