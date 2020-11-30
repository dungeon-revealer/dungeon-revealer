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

export const MarkAreaMapTool: MapTool<
  {
    cursorPosition: SpringValue<[number, number, number]>;
  },
  MarkAreaToolContextValue
> = {
  id: "mark-area-map-tool",
  Context: MarkAreaToolContext,
  Component: () => null,
  createLocalState: () => ({
    cursorPosition: new SpringValue<[number, number, number]>({
      to: [0, 0, 0],
    }),
  }),
  onPointerMove: (event, context, localState) => {
    const position = context.mapState.position.get();
    const scale = context.mapState.scale.get();

    const x = (event.point.x - position[0]) / scale[0];
    const y = (event.point.y - position[1]) / scale[1];

    localState.state.cursorPosition.set([x, y, 0]);
  },
  onClick: (event, context, _, contextValue) => {
    const position = context.mapState.position.get();
    const scale = context.mapState.scale.get();

    const x = (event.point.x - position[0]) / scale[0];
    const y = (event.point.y - position[1]) / scale[1];

    contextValue.onMarkArea(
      context.helper.coordinates.canvasToImage(
        context.helper.coordinates.threeToCanvas([x, y])
      )
    );
  },
};
