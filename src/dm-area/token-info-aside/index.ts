import * as React from "react";
export { TokenInfoAside } from "./token-info-aside";

export const ActiveNoteIdContext = React.createContext<string | null>(null);
export const SetActiveNoteIdContext = React.createContext<
  (noteId: string | null) => void
>(() => undefined);
