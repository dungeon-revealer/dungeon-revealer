import * as React from "react";
import { animated, SpringValue } from "@react-spring/three";
import type { MapTool } from "./map-tool";
import { ThreeLine, ThreeLine2 } from "../three-line";
import { BrushToolContextValue, BrushToolContext } from "./brush-map-tool";
import { applyFogRectangle } from "../canvas-draw-utilities";
import {
  calculateRealX,
  calculateRealY,
  calculateX,
  calculateY,
} from "../map-view";
import { useFrame } from "react-three-fiber";

const Rectangle = (props: {
  p1: SpringValue<[number, number, number]>;
  p2: SpringValue<[number, number, number]>;
}): React.ReactElement => {
  const getPoints = React.useCallback<
    () => Array<[number, number, number]>
  >(() => {
    const p1 = props.p1.get();
    const p2 = props.p2.get();
    return [p1, [p2[0], p1[1], 0], p2, [p1[0], p2[1], 0], p1];
  }, [props.p1, props.p2]);
  const points = React.useMemo<Array<[number, number, number]>>(getPoints, [
    props.p1,
    props.p2,
  ]);
  const ref = React.useRef<null | ThreeLine2>(null);

  useFrame(() => {
    const points = getPoints();
    if (ref.current) {
      ref.current.geometry.setPositions(points.flat());
    }
  });
  return <ThreeLine points={points} color="red" ref={ref} transparent />;
};

export const AreaSelectMapTool: MapTool<
  {
    lastCursorPosition: null | SpringValue<[number, number, number]>;
    cursorPosition: SpringValue<[number, number, number]>;
  },
  BrushToolContextValue
> = {
  id: "area-select-map-tool",
  Context: BrushToolContext,
  createLocalState: () => ({
    lastCursorPosition: null,
    cursorPosition: new SpringValue<[number, number, number]>({
      to: [0, 0, 0],
    }),
  }),
  Component: (props) => {
    const fadeWidth = 0.05;

    return props.localState.state.lastCursorPosition ? (
      <Rectangle
        p1={props.localState.state.lastCursorPosition}
        p2={props.localState.state.cursorPosition}
      />
    ) : (
      <animated.group position={props.localState.state.cursorPosition}>
        <>
          <ThreeLine
            color="red"
            points={[
              [-fadeWidth, 0, 0],
              [fadeWidth, 0, 0],
            ]}
            transparent
            lineWidth={0.5}
          />
          <ThreeLine
            color="red"
            points={[
              [0, fadeWidth, 0],
              [0, -fadeWidth, 0],
            ]}
            transparent
            lineWidth={0.5}
          />
        </>
      </animated.group>
    );
  },
  onPointerMove: (event, context, localState) => {
    const factor = context.dimensions.width / context.fogCanvas.width;
    const position = context.mapState.position.get();
    const scale = context.mapState.scale.get();

    const x = calculateRealX(
      // We need to convert the point to the point local to our element.
      (event.point.x - position[0]) / scale[0],
      factor,
      context.dimensions.width
    );
    const y = calculateRealY(
      // We need to convert the point to the point local to our element.
      (event.point.y - position[1]) / scale[1],
      factor,
      context.dimensions.height
    );

    localState.state.cursorPosition.set([
      calculateX(x, factor, context.dimensions.width),
      calculateY(y, factor, context.dimensions.height),
      0,
    ]);
  },
  onPointerDown: (event, context, localState) => {
    const factor = context.dimensions.width / context.fogCanvas.width;
    const position = context.mapState.position.get();
    const scale = context.mapState.scale.get();

    const x = calculateRealX(
      // We need to convert the point to the point local to our element.
      (event.point.x - position[0]) / scale[0],
      factor,
      context.dimensions.width
    );
    const y = calculateRealY(
      // We need to convert the point to the point local to our element.
      (event.point.y - position[1]) / scale[1],
      factor,
      context.dimensions.height
    );
    localState.setState((state) => ({
      ...state,
      lastCursorPosition: new SpringValue({
        from: [
          calculateX(x, factor, context.dimensions.width),
          calculateY(y, factor, context.dimensions.height),
          0,
        ] as [number, number, number],
      }),
    }));
  },
  onPointerUp: (_, context, localState, contextState) => {
    if (localState.state.lastCursorPosition) {
      const factor = context.dimensions.width / context.fogCanvas.width;
      const fogCanvasContext = context.fogCanvas.getContext("2d")!;
      const p1 = localState.state.cursorPosition.get();
      const p2 = localState.state.lastCursorPosition.get();

      applyFogRectangle(
        contextState.state.fogMode,
        [
          calculateRealX(p1[0], factor, context.dimensions.width),
          calculateRealY(p1[1], factor, context.dimensions.height),
        ],
        [
          calculateRealX(p2[0], factor, context.dimensions.width),
          calculateRealY(p2[1], factor, context.dimensions.height),
        ],
        fogCanvasContext
      );
      context.fogTexture.needsUpdate = true;
      contextState.handlers.onDrawEnd(context.fogCanvas);
    }

    localState.setState((state) => ({
      ...state,
      lastCursorPosition: null,
    }));
  },
};
