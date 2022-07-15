import React from "react";
import { animated } from "@react-spring/three";
import { ThreeLine } from "../three-line";
import { MapTool, SharedMapToolState } from "./map-tool";
import { BrushToolContext } from "./brush-map-tool";
import { ConfigureGridMapToolContext } from "./configure-grid-map-tool";
import { SpringValue } from "react-spring";
import { useGesture } from "react-use-gesture";
import { usePinchWheelZoom } from "./drag-pan-zoom-map-tool";
import { Vector3 } from "three";

export const RulerMapTool: MapTool = {
  id: "ruler-map-tool",
  Component: (props) => {
    const brushContext = React.useContext(BrushToolContext);
    const gridContext = React.useContext(ConfigureGridMapToolContext);
    const [localState, setLocalState] = React.useState(() => ({
      points: null as null | SpringValue<[number, number, number]>[],
    }));

    // common event handlers
    useGesture<{ onKeyDown: KeyboardEvent }>(
      {
        onKeyDown: (args) => {
          if (args.event.key === "Escape") {
            setLocalState((state) => ({
              ...state,
              points: null,
            }));
          }
        },
      },
      {
        domTarget: window.document,
      }
    );

    usePinchWheelZoom(props.mapContext);

    props.useMapGesture({
      onPointerDown: (args) => {
        const point = getCurrentPosition(props.mapContext, args.event.point);

        const points = localState.points || [];
        points.push(point);
        setLocalState((state) => ({
          ...state,
          points: points,
        }));
      },
      onPointerUp: (args) => {},
      onPointerMove: (args) => {
        // console.log(args);
        if (args.dragging) {
          const point = getCurrentPosition(props.mapContext, args.event.point);

          const points = localState.points || [];
          points.splice(points.length - 1, 1, point);
          setLocalState((state) => ({
            ...state,
            points: points,
          }));
        }
      },
    });

    return (
      <animated.group position={[0, 0, 0]}>
        <>
          <ThreeLine
            points={
              localState.points?.map(
                (it) => it.animation.from as [number, number, number]
              ) || [[0, 0, 0]]
            }
          />
        </>
      </animated.group>
    );
  },
};

function getCurrentPosition(
  mapContext: SharedMapToolState,
  point: Vector3
): SpringValue {
  const position = mapContext.mapState.position.get();
  const scale = mapContext.mapState.scale.get();

  return new SpringValue({
    from: [
      (point.x - position[0]) / scale[0],
      (point.y - position[1]) / scale[1],
      0,
    ] as [number, number, number],
  });
}
