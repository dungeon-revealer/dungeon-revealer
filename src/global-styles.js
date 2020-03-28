import { css } from "@emotion/core";
import { getBaseUrl } from "./base-url";

export const globalStyles = css`
  @font-face {
    font-family: "folkard";
    src: url("${getBaseUrl()}/fonts/folkard.woff") format("woff");
  }

  @font-face {
    font-family: "KnightsTemplar";
    src: url("${getBaseUrl()}/fonts/KnightsTemplar.woff") format("woff");
  }

  * {
    box-sizing: border-box;
  }

  button {
    font: unset;
  }

  html,
  body {
    width: 100%;
    height: 100%;
    margin: 0px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
      "Segoe UI Symbol";
    /* user-select: none; */
    font-size: 16px;
  }

  #root {
    height: 100%;
    overflow: hidden;
  }

  input[type="range"] {
    height: 38px;
    -webkit-appearance: none;
    margin: 10px 0;
    width: 100%;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    width: 100%;
    height: 5px;
    cursor: pointer;
    background: lightgray;
    border-radius: 5px;
  }

  input[type="range"]::-webkit-slider-thumb {
    box-shadow: 0px 0px 1px #000000;
    height: 15px;
    width: 15px;
    border-radius: 15px;
    background: #ffffff;
    cursor: pointer;
    -webkit-appearance: none;
    margin-top: -5px;
  }

  h1,
  h2,
  h3 {
    margin: 0;
  }

  h1 {
    font-size: 2rem;
  }

  h2 {
    font-size: 2rem;
  }

  h3 {
    font-size: 1.75rem;
  }

  @media screen and (min-width: 900px) {
    h1 {
      font-size: 2.5rem;
    }
  }
`;
