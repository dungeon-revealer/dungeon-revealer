import React from "react";
import { BackgroundImageContainer } from "./background-image-container";
import { BrandLogoText } from "./brand-logo-text";

export const LoadingScreen = () => {
  return (
    <BackgroundImageContainer>
      <div>
        <BrandLogoText />
        <div>Loading....</div>
      </div>
    </BackgroundImageContainer>
  );
};
