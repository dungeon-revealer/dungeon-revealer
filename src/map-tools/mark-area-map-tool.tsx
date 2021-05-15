import * as React from "react";
import { usePinchWheelZoom } from "./drag-pan-zoom-map-tool";
import type { MapTool } from "./map-tool";

type MarkAreaToolContextValue = {
  onMarkArea: (point: [number, number]) => void;
};

export const MarkAreaToolContext =
  React.createContext<MarkAreaToolContextValue>(
    // TODO: use context that throws if no value is provided
    undefined as any
  );

export const MarkAreaMapTool: MapTool = {
  id: "mark-area-map-tool",
  Component: (props) => {
    const markAreaContext = React.useContext(MarkAreaToolContext);
    usePinchWheelZoom(props.mapContext);
    props.useMapGesture({
      onDrag: ({ movement, memo, event, tap }) => {
        if (props.mapContext.isAltPressed) {
          event.stopPropagation();
          memo = memo ?? props.mapContext.mapState.position.get();
          props.mapContext.setMapState({
            position: [
              memo[0] + movement[0] / props.mapContext.viewport.factor,
              memo[1] - movement[1] / props.mapContext.viewport.factor,
              0,
            ],
            immediate: true,
          });

          return memo;
        }

        // TODO: investigate why the typings are wrong here.
        // @ts-ignore
        const point: THREE.Vector3 = event.point;

        if (event.button === 0 && tap === true) {
          markAreaContext.onMarkArea(
            props.mapContext.helper.threePointToImageCoordinates([
              point.x,
              point.y,
            ])
          );
        }
      },
    });
    return null;
  },
};
