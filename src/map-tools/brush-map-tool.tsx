import * as React from "react";
import { animated, SpringValue } from "@react-spring/three";
import * as io from "io-ts";
import { pipe, identity } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import type { MapTool } from "./map-tool";
import { ThreeLine } from "../three-line";
import {
  applyFog,
  applyInitialFog,
  BrushShape,
  FogMode,
  calculateSquareCoordinates,
} from "../canvas-draw-utilities";
import {
  calculateRealX,
  calculateRealY,
  calculateX,
  calculateY,
} from "../map-view";
import {
  PersistedStateModel,
  usePersistedState,
} from "../hooks/use-persisted-state";

const BrushToolStateModel = io.type({
  brushSize: io.number,
  brushShape: io.union([
    io.literal(BrushShape.circle),
    io.literal(BrushShape.square),
  ]),
  fogMode: io.union([io.literal(FogMode.clear), io.literal(FogMode.shroud)]),
});

export type BrushToolState = io.TypeOf<typeof BrushToolStateModel>;

export const brushToolStateModel: PersistedStateModel<BrushToolState> = {
  encode: (value) => JSON.stringify(value),
  decode: (value) =>
    pipe(
      io.string.decode(value),
      E.chainW((value) => E.parseJSON(value, identity)),
      E.chainW(BrushToolStateModel.decode),
      E.fold((err) => {
        console.log(
          "Error occured while trying to decode value.\n" +
            JSON.stringify(err, null, 2)
        );
        return createDefaultValue();
      }, identity)
    ),
};

const createDefaultValue = (): BrushToolState => ({
  brushSize: 50,
  brushShape: BrushShape.circle,
  fogMode: FogMode.clear,
});

export type BrushToolContextValue = {
  state: BrushToolState;
  setState: React.Dispatch<React.SetStateAction<BrushToolState>>;
  handlers: {
    onDrawEnd: (canvas: HTMLCanvasElement) => void;
  };
};

export const BrushToolContext = React.createContext<BrushToolContextValue>(
  // TODO: use context that throw error if value is not provided
  undefined as any
);

const Square = (props: {
  position: SpringValue<[number, number, number]>;
  width: number;
  color: string;
}): React.ReactElement => {
  const points = React.useMemo(() => {
    const points = calculateSquareCoordinates([0, 0], props.width).map(
      (p) => [...p, 0] as [number, number, number]
    );
    points.push(points[0]);
    return points;
  }, [props.width]);

  return (
    <animated.group position={props.position}>
      <ThreeLine
        color={props.color}
        points={points}
        transparent
        lineWidth={0.5}
      />
    </animated.group>
  );
};

export const BrushToolContextProvider = (props: {
  children: React.ReactNode;
  onDrawEnd: (canvas: HTMLCanvasElement) => void;
}): React.ReactElement => {
  const [state, setState] = usePersistedState("brushTool", brushToolStateModel);

  const handlers = React.useMemo(
    () => ({
      onDrawEnd: props.onDrawEnd,
    }),
    [props.onDrawEnd]
  );

  const value = React.useMemo(
    () => ({
      state,
      setState,
      handlers,
    }),
    [state, handlers]
  );

  return (
    <BrushToolContext.Provider value={value}>
      {props.children}
    </BrushToolContext.Provider>
  );
};

export const BrushMapTool: MapTool<
  {
    lastCursorPosition: null | [number, number];
    cursorPosition: SpringValue<[number, number, number]>;
  },
  BrushToolContextValue
> = {
  id: "brush-map-tool",
  createLocalState: () => ({
    lastCursorPosition: null,
    cursorPosition: new SpringValue<[number, number, number]>({
      to: [0, 0, 0],
    }),
  }),
  Context: BrushToolContext,
  Component: (props) => {
    switch (props.contextState.state.brushShape) {
      case BrushShape.circle: {
        const radius =
          (props.contextState.state.brushSize *
            props.mapContext.dimensions.width) /
          props.mapContext.fogCanvas.width /
          2;

        return (
          <animated.group position={props.localState.state.cursorPosition}>
            <mesh>
              <ringBufferGeometry
                attach="geometry"
                args={[radius * (1 - 0.05), radius, 128]}
              />
              <meshStandardMaterial
                attach="material"
                color={"red"}
                transparent
              />
            </mesh>
          </animated.group>
        );
      }
      case BrushShape.square: {
        const center =
          (props.contextState.state.brushSize *
            props.mapContext.dimensions.width) /
          props.mapContext.fogCanvas.width;
        const coords = calculateSquareCoordinates([0, 0], center).map(
          (p) => [...p, 0] as [number, number, number]
        );

        return (
          <Square
            width={center}
            position={props.localState.state.cursorPosition}
            color="red"
          />
        );
      }
    }
  },
  onPointerDown: (event, context, localState, { state }) => {
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
    localState.state.lastCursorPosition = [x, y];
  },
  onPointerUp: (_, context, localState, contextState) => {
    localState.state.lastCursorPosition = null;
    contextState.handlers.onDrawEnd(context.fogCanvas);
  },
  onPointerMove: (event, context, localState, { state }) => {
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

    if (localState.state.lastCursorPosition) {
      const canvasContext = context.fogCanvas.getContext("2d")!;

      applyFog(
        state.fogMode,
        state.brushShape,
        state.brushSize,
        localState.state.lastCursorPosition,
        [x, y],
        canvasContext
      );
      context.fogTexture.needsUpdate = true;
      localState.state.lastCursorPosition = [x, y];
    }
  },
};
