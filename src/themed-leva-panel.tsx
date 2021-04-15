import * as React from "react";
import { LevaPanel } from "leva";

const levaTheme = {
  colors: {
    elevation1: "#f2f2f2",
    elevation2: "#ffffff",
    elevation3: "#f7f7f7",
    accent1: "#ccc",
    accent2: "#e6e6e6",
    accent3: "#ccc",
    highlight1: "#b3b3b3",
    highlight2: "#000",
    highlight3: "#000",
  },
  fonts: {
    mono: "inherit",
    sans: "inherit",
  },
};

export const ThemedLevaPanel = (
  props: React.ComponentProps<typeof LevaPanel>
) => <LevaPanel {...props} theme={levaTheme} />;
