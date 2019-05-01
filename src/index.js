import React from "react";
import { render } from "react-dom";
import "./style.css";

const element = document.querySelector("#root");

const main = async () => {
  let component = null;
  switch (window.location.pathname) {
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
    render(component, element);
  }
};

main();
