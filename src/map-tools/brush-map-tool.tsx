import * as React from "react";
import { animated, SpringValue } from "@react-spring/three";
import type { MapTool } from "./map-tool";
import {
  applyFog,
  applyInitialFog,
  BrushShape,
  FogMode,
} from "../canvas-draw-utilities";
import {
  calculateRealX,
  calculateRealY,
  calculateX,
  calculateY,
} from "../map-view";

type BrushToolState = {
  brushSize: number;
  brushShape: BrushShape;
  fogMode: FogMode;
};

const BrushToolContext = React.createContext<BrushToolState>({
  brushSize: 50,
  brushShape: BrushShape.square,
  fogMode: FogMode.shroud,
});

export const brushTool: MapTool<
  {
    lastCursorPosition: null | [number, number];
    cursorPosition: SpringValue<[number, number, number]>;
  },
  BrushToolState
> = {
  createMutableState: () => ({
    lastCursorPosition: null,
    cursorPosition: new SpringValue<[number, number, number]>({
      to: [0, 0, 0],
    }),
  }),
  Context: BrushToolContext,
  Component: (props) => {
    return (
      <animated.group position={props.mutableState.cursorPosition}>
        <mesh>
          <circleBufferGeometry attach="geometry" args={[0.1, 32]} />
          <meshStandardMaterial attach="material" color={"red"} />
        </mesh>
      </animated.group>
    );
  },
  onPointerDown: (event, context, mutableState, state) => {
    const canvasContext = context.fogCanvas.getContext("2d")!;
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

    applyInitialFog(
      state.fogMode,
      state.brushShape,
      state.brushSize,
      [x, y],
      canvasContext!
    );
    context.fogTexture.needsUpdate = true;
    mutableState.lastCursorPosition = [x, y];
  },
  onPointerUp: (_, __, mutableState) => {
    mutableState.lastCursorPosition = null;
  },
  onPointerMove: (event, context, mutableState, state) => {
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

    const cursorFactor = context.dimensions.width / context.mapImage.width;
    mutableState.cursorPosition.set([
      calculateX(x, cursorFactor, context.dimensions.width),
      calculateY(y, cursorFactor, context.dimensions.height),
      0,
    ]);

    if (mutableState.lastCursorPosition) {
      const canvasContext = context.fogCanvas.getContext("2d")!;

      applyFog(
        state.fogMode,
        state.brushShape,
        state.brushSize,
        mutableState.lastCursorPosition,
        [x, y],
        canvasContext
      );
      context.fogTexture.needsUpdate = true;
      mutableState.lastCursorPosition = [x, y];
    }
  },
};
