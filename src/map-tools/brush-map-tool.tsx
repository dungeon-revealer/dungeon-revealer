import * as React from "react";
import { animated } from "@react-spring/three";
import { SpringValue } from "@react-spring/core";
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
import { usePinchWheelZoom } from "./drag-pan-zoom-map-tool";
import {
  MaybeAnimatableValue,
  isAnimatableValue,
} from "../utilities/spring/animatable-value";

const BrushToolStateModel = io.type({
  brushSize: io.number,
  brushShape: io.union([
    io.literal(BrushShape.circle),
    io.literal(BrushShape.square),
  ]),
  fogMode: io.union([io.literal(FogMode.clear), io.literal(FogMode.shroud)]),
});

export type BrushToolState = {
  brushSize: SpringValue<number>;
  brushShape: BrushShape;
  fogMode: FogMode;
};

export const brushToolStateModel: PersistedStateModel<BrushToolState> = {
  encode: (value) =>
    JSON.stringify({
      ...value,
      brushSize: value.brushSize.get(),
    }),
  decode: (value) =>
    pipe(
      io.string.decode(value),
      E.chainW((value) => E.parseJSON(value, identity)),
      E.chainW(BrushToolStateModel.decode),
      E.map((value) => ({
        ...value,
        brushSize: new SpringValue<number>({ from: value.brushSize }),
      })),
      E.fold((err) => {
        console.log(
          "Error occurred while trying to decode value.\n" +
            JSON.stringify(err, null, 2)
        );
        return createDefaultValue();
      }, identity)
    ),
};

const createDefaultValue = (): BrushToolState => ({
  brushSize: new SpringValue({ from: 50 }),
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
  position: MaybeAnimatableValue<[number, number, number]>;
  width: MaybeAnimatableValue<number>;
  color: string;
}): React.ReactElement => {
  const [initialWidth] = React.useState(() =>
    isAnimatableValue(props.width) ? props.width.get() : props.width
  );

  const points = React.useMemo(() => {
    const points = calculateSquareCoordinates([0, 0], initialWidth).map(
      (p) => [...p, 0] as [number, number, number]
    );
    points.push(points[0]);
    return points;
  }, [initialWidth]);

  return (
    <animated.group
      position={props.position}
      scale={
        isAnimatableValue(props.width)
          ? props.width.to((value) => [
              value / initialWidth,
              value / initialWidth,
              1,
            ])
          : undefined
      }
    >
      <ThreeLine
        color={props.color}
        points={points}
        transparent
        lineWidth={0.5}
      />
    </animated.group>
  );
};

const Circle = (props: {
  radius: MaybeAnimatableValue<number>;
  position: MaybeAnimatableValue<[number, number, number]>;
}) => {
  const [initialRadius] = React.useState(() =>
    isAnimatableValue(props.radius) ? props.radius.get() : props.radius
  );

  const radius = isAnimatableValue(props.radius) ? initialRadius : props.radius;

  return (
    <animated.mesh
      position={props.position}
      scale={
        isAnimatableValue(props.radius)
          ? props.radius.to((value) => [
              value / initialRadius,
              value / initialRadius,
              1,
            ])
          : undefined
      }
    >
      <ringBufferGeometry
        attach="geometry"
        args={[radius * (1 - 0.01), radius, 128]}
      />
      <meshStandardMaterial attach="material" color="red" transparent />
    </animated.mesh>
  );
};

export const BrushToolContextProvider = (props: {
  children: React.ReactNode;
  onDrawEnd: (canvas: HTMLCanvasElement) => void;
}): React.ReactElement => {
  // TODO: after AnimatedValue got changed we should queue a debounced brushToolStateModel save
  // Maybe we should also just use zustand to avoid re-renders in a lot of components
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

    usePinchWheelZoom(props.mapContext);

    props.useMapGesture({
      onPointerDown: () => {
        if (props.mapContext.isAltPressed) {
          return;
        }
        const position: [number, number] = [
          props.mapContext.pointerPosition.get()[0],
          props.mapContext.pointerPosition.get()[1],
        ];

        const canvasContext = props.mapContext.fogCanvas.getContext("2d")!;

        applyInitialFog(
          brushContext.state.fogMode,
          brushContext.state.brushShape,
          brushContext.state.brushSize.get(),
          props.mapContext.helper.coordinates.threeToCanvas(position),
          canvasContext!
        );
        props.mapContext.fogTexture.needsUpdate = true;
        localState.lastPointerPosition = position;
      },
      onPointerUp: () => {
        if (props.mapContext.isAltPressed) {
          return;
        }
        localState.lastPointerPosition = null;
        brushContext.handlers.onDrawEnd(props.mapContext.fogCanvas);
      },
      onPointerMove: () => {
        if (props.mapContext.isAltPressed) {
          return;
        }
        if (localState.lastPointerPosition) {
          const canvasContext = props.mapContext.fogCanvas.getContext("2d")!;

          const position: [number, number] = [
            props.mapContext.pointerPosition.get()[0],
            props.mapContext.pointerPosition.get()[1],
          ];

          applyFog(
            brushContext.state.fogMode,
            brushContext.state.brushShape,
            brushContext.state.brushSize.get(),
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
      onDrag: ({ movement, memo, event }) => {
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
      },
    });

    if (props.mapContext.isAltPressed) {
      return null;
    }

    switch (brushContext.state.brushShape) {
      case BrushShape.circle: {
        return (
          <Circle
            position={props.mapContext.pointerPosition}
            radius={brushContext.state.brushSize.to(
              (radius) =>
                (radius * props.mapContext.dimensions.width) /
                props.mapContext.fogCanvas.width /
                2
            )}
          />
        );
      }
      case BrushShape.square: {
        return (
          <Square
            width={brushContext.state.brushSize.to(
              (value) =>
                (value * props.mapContext.dimensions.width) /
                props.mapContext.fogCanvas.width
            )}
            position={props.mapContext.pointerPosition}
            color="red"
          />
        );
      }
    }
  },
};
