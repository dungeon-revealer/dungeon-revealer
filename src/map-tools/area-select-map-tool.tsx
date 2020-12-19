import * as React from "react";
import { animated, SpringValue, Interpolation, to } from "@react-spring/three";
import { useFrame } from "react-three-fiber";
import { useGesture } from "react-use-gesture";
import * as io from "io-ts";
import { pipe, identity } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import { ThreeLine, ThreeLine2 } from "../three-line";
import { applyFogRectangle } from "../canvas-draw-utilities";
import type { MapTool } from "./map-tool";
import { BrushToolContext } from "./brush-map-tool";
import { ConfigureGridMapToolContext } from "./configure-grid-map-tool";
import {
  PersistedStateModel,
  usePersistedState,
} from "../hooks/use-persisted-state";
import { midBetweenPoints } from "../canvas-draw-utilities";
import { usePinchWheelZoom } from "./drag-pan-zoom-map-tool";

type Point =
  | Interpolation<[number, number, number]>
  | SpringValue<[number, number, number]>
  | [number, number, number];

const getRawPoint = (point: Point): [number, number, number] =>
  point instanceof SpringValue || point instanceof Interpolation
    ? point.get()
    : point;

export const Rectangle = (props: {
  p1: Point;
  p2: Point;
  borderColor: string;
}): React.ReactElement => {
  const getPoints = React.useCallback<
    () => Array<[number, number, number]>
  >(() => {
    const p1 = getRawPoint(props.p1);
    const p2 = getRawPoint(props.p2);
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
    <ThreeLine
      points={points}
      color={props.borderColor}
      ref={ref}
      transparent
    />
  );
};

export const RectanglePlane = (props: {
  p1:
    | SpringValue<[number, number, number]>
    | Interpolation<[number, number, number]>;
  p2:
    | SpringValue<[number, number, number]>
    | Interpolation<[number, number, number]>;
  color: string;
}) => {
  return (
    <animated.mesh
      position={to([props.p1, props.p2] as const, ([x1, y1], [x2, y2]) => {
        const [x, y] = midBetweenPoints([x1, y1], [x2, y2]);
        return [x, y, 0];
      })}
      scale={to([props.p1, props.p2] as const, ([x1, y1], [x2, y2]) => [
        x1 - x2,
        y1 - y2,
        1,
      ])}
    >
      <planeBufferGeometry attach="geometry" args={[1, 1]} />
      <meshStandardMaterial
        attach="material"
        color={props.color}
        transparent={true}
        opacity={0.5}
      />
    </animated.mesh>
  );
};

const AreaSelectModel = io.type({
  snapToGrid: io.boolean,
});

type AreaSelectState = io.TypeOf<typeof AreaSelectModel>;

type AreaSelectContextValue = {
  state: AreaSelectState;
  setState: React.Dispatch<React.SetStateAction<AreaSelectState>>;
};

const createDefaultValue = (): AreaSelectState => ({
  snapToGrid: false,
});

const areaSelectStateModel: PersistedStateModel<AreaSelectState> = {
  encode: (value) => JSON.stringify(value),
  decode: (value) =>
    pipe(
      io.string.decode(value),
      E.chainW((value) => E.parseJSON(value, identity)),
      E.chainW(AreaSelectModel.decode),
      E.fold((err) => {
        if (value !== null) {
          console.log(
            "Error occured while trying to decode value.\n" +
              JSON.stringify(err, null, 2)
          );
        }
        return createDefaultValue();
      }, identity)
    ),
};

export const AreaSelectContext = React.createContext<AreaSelectContextValue>(
  // TODO: use context that throw error if value is not provided
  undefined as any
);

export const AreaSelectContextProvider = (props: {
  children: React.ReactNode;
}): React.ReactElement => {
  const [state, setState] = usePersistedState(
    "areaSelectTool",
    areaSelectStateModel
  );

  const value = React.useMemo(
    () => ({
      state,
      setState,
    }),
    [state, setState]
  );

  return (
    <AreaSelectContext.Provider value={value}>
      {props.children}
    </AreaSelectContext.Provider>
  );
};

export const AreaSelectMapTool: MapTool = {
  id: "area-select-map-tool",
  Component: (props) => {
    const brushContext = React.useContext(BrushToolContext);
    const areaSelectContext = React.useContext(AreaSelectContext);
    const gridContext = React.useContext(ConfigureGridMapToolContext);
    const [localState, setLocalState] = React.useState(() => ({
      lastPointerPosition: null as null | SpringValue<[number, number, number]>,
    }));

    const gridDimensions = React.useMemo(
      () => ({
        columnDimensions: props.mapContext.helper.vector.canvasToThree(
          props.mapContext.helper.vector.imageToCanvas([
            gridContext.state.columnWidth,
            gridContext.state.columnHeight,
          ])
        ),
        gridPosition: props.mapContext.helper.coordinates.canvasToThree(
          props.mapContext.helper.coordinates.imageToCanvas([
            gridContext.state.offsetX,
            gridContext.state.offsetY,
          ])
        ),
      }),
      [gridContext.state]
    );

    const fadeWidth = 0.05;

    useGesture<{ onKeyDown: KeyboardEvent }>(
      {
        onKeyDown: (args) => {
          if (args.event.key === "Escape") {
            setLocalState((state) => ({
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

    const getSnappedX = (x: number) => {
      let currentX = gridDimensions.gridPosition[0];
      let step =
        (x > gridDimensions.gridPosition[0] ? 1 : -1) *
        gridDimensions.columnDimensions[0];

      while (Math.abs(currentX - x) > gridDimensions.columnDimensions[0] / 2) {
        currentX = currentX + step;
      }

      return currentX;
    };

    const getSnappedY = (y: number) => {
      let currentY = gridDimensions.gridPosition[1];
      let step =
        (y > gridDimensions.gridPosition[1] ? 1 : -1) *
        gridDimensions.columnDimensions[1];

      while (Math.abs(currentY - y) > gridDimensions.columnDimensions[1] / 2) {
        currentY = currentY + step;
      }

      return currentY;
    };

    usePinchWheelZoom(props.mapContext);

    props.useMapGesture({
      onPointerDown: (args) => {
        if (props.mapContext.isAltPressed) {
          return;
        }
        const position = props.mapContext.mapState.position.get();
        const scale = props.mapContext.mapState.scale.get();

        setLocalState((state) => ({
          ...state,
          lastPointerPosition: new SpringValue({
            from: [
              (args.event.point.x - position[0]) / scale[0],
              (args.event.point.y - position[1]) / scale[1],
              0,
            ] as [number, number, number],
          }),
        }));
      },
      onPointerUp: () => {
        if (props.mapContext.isAltPressed) {
          return;
        }
        if (localState.lastPointerPosition) {
          const fogCanvasContext = props.mapContext.fogCanvas.getContext("2d")!;
          let p1 = props.mapContext.pointerPosition.get();
          let p2 = localState.lastPointerPosition.get();

          if (areaSelectContext.state.snapToGrid === true) {
            p1 = [getSnappedX(p1[0]), getSnappedY(p1[1]), 1];
            p2 = [getSnappedX(p2[0]), getSnappedY(p2[1]), 1];
          }

          applyFogRectangle(
            brushContext.state.fogMode,
            props.mapContext.helper.coordinates.threeToCanvas([p1[0], p1[1]]),
            props.mapContext.helper.coordinates.threeToCanvas([p2[0], p2[1]]),
            fogCanvasContext
          );
          props.mapContext.fogTexture.needsUpdate = true;
          brushContext.handlers.onDrawEnd(props.mapContext.fogCanvas);
        }

        setLocalState((state) => ({
          ...state,
          lastPointerPosition: null,
        }));
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

    if (localState.lastPointerPosition) {
      return (
        <>
          {areaSelectContext.state.snapToGrid ? (
            <RectanglePlane
              p1={localState.lastPointerPosition.to((x, y, z) => [
                getSnappedX(x),
                getSnappedY(y),
                z,
              ])}
              p2={props.mapContext.pointerPosition.to((x, y, z) => [
                getSnappedX(x),
                getSnappedY(y),
                z,
              ])}
              color="aqua"
            />
          ) : null}
          <Rectangle
            p1={localState.lastPointerPosition}
            p2={props.mapContext.pointerPosition}
            borderColor="red"
          />
        </>
      );
    }

    return (
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
};
