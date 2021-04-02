import { css } from "@emotion/react";
import { buildUrl } from "./public-url";

export const globalStyles = css`
  @font-face {
    font-family: "folkard";
    src: url("${buildUrl("/fonts/folkard.woff")}") format("woff");
  }

  @font-face {
    font-family: "KnightsTemplar";
    src: url("${buildUrl("/fonts/KnightsTemplar.woff")}") format("woff");
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
    overflow: hidden;
  }

  html {
    touch-action: none;
  }

  .user-select-disabled {
    * {
      user-select: none !important;
    }
  }

  #root {
    height: 100%;
    overflow: hidden;
    /* Prevent content dragging on safari */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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

  .no-focus-outline *:focus {
    outline: none !important;
  }

  .react-colorful__pointer {
    width: 20px;
    height: 20px;
  }
`;
