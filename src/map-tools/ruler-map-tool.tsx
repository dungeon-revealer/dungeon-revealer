import React from "react";
import { animated } from "@react-spring/three";
import { ThreeLine } from "../three-line";
import { MapTool, SharedMapToolState } from "./map-tool";
import { BrushToolContext } from "./brush-map-tool";
import { SpringValue } from "react-spring";
import { useGesture } from "react-use-gesture";
import { usePinchWheelZoom } from "./drag-pan-zoom-map-tool";
import { Vector3 } from "three";
import { zip } from "fp-ts/lib/ReadonlyArray";
import { max } from "lodash";
import { MaybeAnimatableValue } from "../utilities/spring/animatable-value";
import { CanvasText } from "../canvas-text";
import { buildUrl } from "../public-url";

const FloatingTextBox = (props: {
  position: MaybeAnimatableValue<[number, number, number]>;
  width: MaybeAnimatableValue<number>;
  color: string;
  value: string;
}): React.ReactElement => {
  // const [initialWidth] = React.useState(() =>
  // isAnimatableValue(props.width) ? props.width.get() : props.width
  // );

  // const points = React.useMemo(() => {
  //   const points = calculateSquareCoordinates([0, 0], initialWidth).map(
  //     (p) => [...p, 0] as [number, number, number]
  //   );
  //   points.push(points[0]);
  //   return points;
  // }, [initialWidth]);

  return (
    <animated.group
      position={props.position}
      scale={
        undefined
        // isAnimatableValue(props.width)
        //   ? props.width.to((value) => [
        //       value / initialWidth,
        //       value / initialWidth,
        //       1,
        //     ])
        // : undefined
      }
    >
      {/* <ThreeLine
        color={props.color}
        points={points}
        transparent
        lineWidth={0.5}
      /> */}
      <CanvasText
        fontSize={0.1}
        color={props.color}
        font={buildUrl("/fonts/Roboto-Bold.ttf")}
        anchorX="center"
        anchorY="middle"
        // position={props.position}
        renderOrder={0}
      >
        {props.value}
      </CanvasText>
    </animated.group>
  );
};

export const RulerMapTool: MapTool = {
  id: "ruler-map-tool",
  Component: (props) => {
    const brushContext = React.useContext(BrushToolContext);
    // const gridContext = React.useContext(ConfigureGridMapToolContext);
    // const grid = useFragment(GridRendererFragment, props.mapContext.grid);

    const [localState, setLocalState] = React.useState(() => ({
      points: null as null | SpringValue<[number, number, number]>[],
    }));

    const isGridConfigured = props.mapContext.grid != undefined;

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

    var _distance: string | undefined;
    if (localState.points) {
      const [distanceX, distanceY] = zip(
        localState.points?.slice(0, -1),
        localState.points?.slice(1)
      ).reduce(
        (acc, elem) => {
          const [prev, cur] = elem;
          if (isGridConfigured) {
            const grid = props.mapContext.grid;
            // console.log(props.mapContext);
            const threeToCanvas =
              props.mapContext.helper.coordinates.threeToCanvas;
            const curCoords = threeToCanvas(cur.get().slice(0, 2) as any);
            const prevCoords = threeToCanvas(prev.get().slice(0, 2) as any);
            // console.log("Coordinates: " + curCoords);
            const dxCells =
              Math.abs(curCoords[0] - prevCoords[0]) / grid.columnWidth;
            const dyCells =
              Math.abs(curCoords[1] - prevCoords[1]) / grid.columnHeight;
            const distance = max([dxCells, dyCells]) || 0;
            // console.log("Distance between points is " + distance);
            return [acc[0] + dxCells, acc[1] + dyCells];
          } else {
            const distance = Math.hypot(
              cur.get()[0] - prev.get()[0],
              cur.get()[1] - prev.get()[1]
            );
            // console.log("Distance between points is " + distance);
            return [acc[0] + distance, 0];
          }
        },
        [0, 0]
      );
      _distance = max([distanceX, distanceY])?.toFixed(1);
      // console.log("TOTAL DISTANCE: " + _distance);
    } else {
      _distance = undefined;
    }
    const distance = _distance;

    let color: string | null;
    if (props.mapContext.grid) {
      color = props.mapContext.grid.color;
    } else {
      color = "black";
    }
    return (
      <animated.group position={[0, 0, 0]}>
        <>
          <ThreeLine
            points={
              localState.points?.map(
                (it) => it.animation.from as [number, number, number]
              ) || [[0, 0, 0]]
            }
            color={color}
          />
          {distance != undefined && (
            <FloatingTextBox
              position={props.mapContext.pointerPosition}
              width={2}
              color={color}
              value={distance + ""}
            ></FloatingTextBox>
          )}
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
