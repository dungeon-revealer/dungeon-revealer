import * as React from "react";
import type { MapTool } from "./map-tool";

type MarkAreaToolContextValue = {
  onMarkArea: (point: [number, number]) => void;
};

export const MarkAreaToolContext = React.createContext<MarkAreaToolContextValue>(
  // TODO: use context that throws if no value is provided
  undefined as any
);

export const MarkAreaMapTool: MapTool = {
  id: "mark-area-map-tool",
  Component: (props) => {
    const markAreaContext = React.useContext(MarkAreaToolContext);
    props.useMapGesture({
      onClick: () => {
        const position = props.mapContext.pointerPosition.get();
        markAreaContext.onMarkArea(
          props.mapContext.helper.coordinates.canvasToImage(
            props.mapContext.helper.coordinates.threeToCanvas([
              position[0],
              position[1],
            ])
          )
        );
      },
    });
    return null;
  },
};
