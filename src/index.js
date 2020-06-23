import * as React from "react";
import { Global } from "@emotion/core";
import { render } from "react-dom";
import { getUrlPrefix } from "./public-url";
import { globalStyles } from "./global-styles";
import { Modal } from "./modal";

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

// Listen to tab events to enable outlines (accessibility improvement)
document.body.addEventListener("keyup", (ev) => {
  /* tab */
  if (ev.keyCode === 9) {
    document.body.classList.remove("no-focus-outline");
  }
});

const pathname = window.location.pathname.replace(getUrlPrefix(), "");

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
      <Modal.Provider>
        <Global styles={globalStyles}></Global>
        {component}
      </Modal.Provider>,
      element
    );
  }
};

main();
