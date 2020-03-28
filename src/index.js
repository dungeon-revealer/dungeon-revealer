import React from "react";
import { Global } from "@emotion/core";
import { render } from "react-dom";
import { getBaseUrl } from "./base-url";
import { globalStyles } from "./global-styles";

const element = document.querySelector("#root");

//
// hack for disabling pinch zoom in Safari
// Unfortunately, Safari does ignore the following HTML meta tags...
// maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, shrink-to-fit=no
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  window.addEventListener(
    "touchstart",
    (ev) => {
      ev.preventDefault();
    },
    { passive: false }
  );
}

const pathname =
  getBaseUrl() === ""
    ? window.location.pathname
    : window.location.href.replace(getBaseUrl(), "");

const main = async () => {
  let component = null;
  switch (pathname) {
    case "/dm": {
      const { DmArea } = await import("./dm-area");
      component = <DmArea />;
      break;
    }
    default: {
      const { PlayerArea } = await import("./player-area");
      component = <PlayerArea />;
    }
  }
  if (element) {
    render(
      <>
        <Global styles={globalStyles}></Global>
        {component}
      </>,
      element
    );
  }
};

main();
