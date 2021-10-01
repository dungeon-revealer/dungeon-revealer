import * as React from "react";
import type { MapTokenEntity } from "./map-typings";

export const UpdateTokenContext = React.createContext<
  (id: string, props: Omit<Partial<MapTokenEntity>, "id">) => void
>(() => undefined);
