import * as React from "react";
import type { MapTool } from "./map-tool";
import { SpringValue } from "@react-spring/three";

type MarkAreaToolContextValue = {
  onMarkArea: (point: [number, number]) => void;
};

export const MarkAreaToolContext = React.createContext<MarkAreaToolContextValue>(
  // TODO: use context that throws if no value is provided
  undefined as any
);

export const MarkAreaMapTool: MapTool<{}, MarkAreaToolContextValue> = {
  id: "mark-area-map-tool",
  Context: MarkAreaToolContext,
  Component: () => null,
  createLocalState: () => ({}),
  onClick: (_, context, __, contextValue) => {
    const position = context.pointerPosition.get();

    contextValue.onMarkArea(
      context.helper.coordinates.canvasToImage(
        context.helper.coordinates.threeToCanvas([position[0], position[1]])
      )
    );
  },
};
