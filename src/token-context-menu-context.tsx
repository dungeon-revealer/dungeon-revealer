import * as React from "react";
import type { SpringValue } from "react-spring";

export type TokenContextMenuState =
  | {
      type: "none-selected";
    }
  | {
      type: "selected";
      tokenId: string;
      position: SpringValue<[number, number]>;
    };

export const TokenContextMenuContext = React.createContext<null | {
  state: TokenContextMenuState;
  setState: React.Dispatch<React.SetStateAction<TokenContextMenuState>>;
}>(null);
