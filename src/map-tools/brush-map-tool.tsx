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

export const Square = (props: {
  position: SpringValue<[number, number, number]> | [number, number, number];
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

export const BrushMapTool: MapTool = {
  id: "brush-map-tool",
  Component: (props) => {
    const brushContext = React.useContext(BrushToolContext);
    const [localState] = React.useState(() => ({
      lastPointerPosition: null as null | [number, number],
    }));

    props.useMapGesture({
      onPointerDown: () => {
        const position: [number, number] = [
          props.mapContext.pointerPosition.get()[0],
          props.mapContext.pointerPosition.get()[1],
        ];

        const canvasContext = props.mapContext.fogCanvas.getContext("2d")!;

        applyInitialFog(
          brushContext.state.fogMode,
          brushContext.state.brushShape,
          brushContext.state.brushSize,
          props.mapContext.helper.coordinates.threeToCanvas(position),
          canvasContext!
        );
        props.mapContext.fogTexture.needsUpdate = true;
        localState.lastPointerPosition = position;
      },
      onPointerUp: () => {
        localState.lastPointerPosition = null;
        brushContext.handlers.onDrawEnd(props.mapContext.fogCanvas);
      },
      onPointerMove: () => {
        if (localState.lastPointerPosition) {
          const canvasContext = props.mapContext.fogCanvas.getContext("2d")!;

          const position: [number, number] = [
            props.mapContext.pointerPosition.get()[0],
            props.mapContext.pointerPosition.get()[1],
          ];

          applyFog(
            brushContext.state.fogMode,
            brushContext.state.brushShape,
            brushContext.state.brushSize,
            props.mapContext.helper.coordinates.threeToCanvas(
              localState.lastPointerPosition
            ),
            props.mapContext.helper.coordinates.threeToCanvas(position),
            canvasContext
          );
          props.mapContext.fogTexture.needsUpdate = true;
          localState.lastPointerPosition = position;
        }
      },
    });

    switch (brushContext.state.brushShape) {
      case BrushShape.circle: {
        const radius =
          (brushContext.state.brushSize * props.mapContext.dimensions.width) /
          props.mapContext.fogCanvas.width /
          2;

        return (
          <animated.group position={props.mapContext.pointerPosition}>
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
          (brushContext.state.brushSize * props.mapContext.dimensions.width) /
          props.mapContext.fogCanvas.width;
        return (
          <Square
            width={center}
            position={props.mapContext.pointerPosition}
            color="red"
          />
        );
      }
    }
  },
};
