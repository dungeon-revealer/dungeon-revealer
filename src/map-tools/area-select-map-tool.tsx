import * as React from "react";
import { animated, SpringValue } from "@react-spring/three";
import type { MapTool } from "./map-tool";
import { ThreeLine, ThreeLine2 } from "../three-line";
import { BrushToolContextValue, BrushToolContext } from "./brush-map-tool";
import { applyFogRectangle } from "../canvas-draw-utilities";
import { useFrame } from "react-three-fiber";
import { useGesture } from "react-use-gesture";

export const Rectangle = (props: {
  p1: SpringValue<[number, number, number]> | [number, number, number];
  p2: SpringValue<[number, number, number]> | [number, number, number];
  color: string;
}): React.ReactElement => {
  const getPoints = React.useCallback<
    () => Array<[number, number, number]>
  >(() => {
    const p1 = props.p1 instanceof SpringValue ? props.p1.get() : props.p1;
    const p2 = props.p2 instanceof SpringValue ? props.p2.get() : props.p2;
    return [p1, [p2[0], p1[1], 0], p2, [p1[0], p2[1], 0], p1];
  }, [props.p1, props.p2]);

  const points = React.useMemo<Array<[number, number, number]>>(getPoints, [
    props.p1,
    props.p2,
  ]);
  const ref = React.useRef<null | ThreeLine2>(null);

  useFrame(() => {
    if (ref.current) {
      const points = getPoints();
      ref.current.geometry.setPositions(points.flat());
    }
  });
  return (
    <ThreeLine points={points} color={props.color} ref={ref} transparent />
  );
};

export const AreaSelectMapTool: MapTool<
  {
    lastPointerPosition: null | SpringValue<[number, number, number]>;
  },
  BrushToolContextValue
> = {
  id: "area-select-map-tool",
  Context: BrushToolContext,
  createLocalState: () => ({
    lastPointerPosition: null,
  }),
  Component: (props) => {
    const fadeWidth = 0.05;

    useGesture<{ onKeyDown: KeyboardEvent }>(
      {
        onKeyDown: (args) => {
          if (args.event.key === "Escape") {
            props.localState.setState((state) => ({
              ...state,
              lastPointerPosition: null,
            }));
          }
        },
      },
      {
        domTarget: window.document,
      }
    );

    return props.localState.state.lastPointerPosition ? (
      <Rectangle
        p1={props.localState.state.lastPointerPosition}
        p2={props.mapContext.pointerPosition}
        color="red"
      />
    ) : (
      <animated.group position={props.mapContext.pointerPosition}>
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
  onPointerDown: (event, context, localState) => {
    const position = context.mapState.position.get();
    const scale = context.mapState.scale.get();

    localState.setState((state) => ({
      ...state,
      lastPointerPosition: new SpringValue({
        from: [
          (event.point.x - position[0]) / scale[0],
          (event.point.y - position[1]) / scale[1],
          0,
        ] as [number, number, number],
      }),
    }));
  },
  onPointerUp: (_, context, localState, contextState) => {
    if (localState.state.lastPointerPosition) {
      const fogCanvasContext = context.fogCanvas.getContext("2d")!;
      const p1 = context.pointerPosition.get();
      const p2 = localState.state.lastPointerPosition.get();

      applyFogRectangle(
        contextState.state.fogMode,
        context.helper.coordinates.threeToCanvas([p1[0], p1[1]]),
        context.helper.coordinates.threeToCanvas([p2[0], p2[1]]),
        fogCanvasContext
      );
      context.fogTexture.needsUpdate = true;
      contextState.handlers.onDrawEnd(context.fogCanvas);
    }

    localState.setState((state) => ({
      ...state,
      lastPointerPosition: null,
    }));
  },
};
