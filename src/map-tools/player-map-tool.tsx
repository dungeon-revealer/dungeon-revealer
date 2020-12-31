import * as React from "react";
import { MapTool } from "./map-tool";
import { MarkAreaToolContext } from "./mark-area-map-tool";
import { usePinchWheelZoom } from "./drag-pan-zoom-map-tool";

export const PlayerMapTool: MapTool = {
  id: "player-map-tool",
  Component: (props) => {
    const markAreaContext = React.useContext(MarkAreaToolContext);
    usePinchWheelZoom(props.mapContext);

    const timeoutRef = React.useRef<null | (() => void)>(null);

    props.useMapGesture({
      onPointerUp: () => {
        timeoutRef.current?.();
      },
      onPointerDown: ({ event }) => {
        const point: THREE.Vector3 = event.point;
        const [x, y] = props.mapContext.helper.threePointToImageCoordinates([
          point.x,
          point.y,
        ]);
        const timeout = setTimeout(() => {
          markAreaContext.onMarkArea([x, y]);
        }, 300);
        timeoutRef.current = () => clearTimeout(timeout);
      },
      onDrag: ({ movement, memo, event, tap }) => {
        if (tap) {
          return;
        }
        timeoutRef.current?.();
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
      },
    });
    return null;
  },
};
