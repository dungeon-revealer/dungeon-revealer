import * as React from "react";
import { animated, SpringValue } from "@react-spring/three";
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
import { Mesh, PlaneBufferGeometry } from "three";

export const Rectangle = (props: {
  p1: SpringValue<[number, number, number]> | [number, number, number];
  p2: SpringValue<[number, number, number]> | [number, number, number];
  borderColor: string;
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
    <ThreeLine
      points={points}
      color={props.borderColor}
      ref={ref}
      transparent
    />
  );
};

export const RectanglePlane = (props: {
  p1: SpringValue<[number, number, number]> | [number, number, number];
  p2: SpringValue<[number, number, number]> | [number, number, number];
  color: string;
}) => {
  const getWidth = () =>
    (props.p1 instanceof SpringValue ? props.p1.get() : props.p1)[0] -
    (props.p2 instanceof SpringValue ? props.p2.get() : props.p2)[0];
  const getHeight = () =>
    (props.p1 instanceof SpringValue ? props.p1.get() : props.p1)[1] -
    (props.p2 instanceof SpringValue ? props.p2.get() : props.p2)[1];
  const ref = React.useRef<null | PlaneBufferGeometry>(null);
  const ref1 = React.useRef<null | Mesh>(null);

  const center = useFrame(() => {
    if (ref.current && ref1.current) {
      const [x1, y1] =
        props.p1 instanceof SpringValue ? props.p1.get() : props.p1;
      const [x2, y2] =
        props.p2 instanceof SpringValue ? props.p2.get() : props.p2;

      const [x, y] = midBetweenPoints([x1, y1], [x2, y2]);
      ref1.current.position.x = x;
      ref1.current.position.y = y;
      ref1.current.scale.x = getWidth();
      ref1.current.scale.y = getHeight();
    }
  });
  return (
    <mesh ref={ref1}>
      <planeBufferGeometry attach="geometry" args={[1, 1]} ref={ref} />
      <meshStandardMaterial attach="material" color={props.color} />
    </mesh>
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

    props.useMapGesture({
      onPointerDown: (args) => {
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
        if (localState.lastPointerPosition) {
          const fogCanvasContext = props.mapContext.fogCanvas.getContext("2d")!;
          const p1 = props.mapContext.pointerPosition.get();
          const p2 = localState.lastPointerPosition.get();

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
    });

    return localState.lastPointerPosition ? (
      <>
        {areaSelectContext.state.snapToGrid ? (
          <RectanglePlane
            p1={localState.lastPointerPosition}
            p2={props.mapContext.pointerPosition}
            color="aqua"
          />
        ) : null}
        <Rectangle
          p1={localState.lastPointerPosition}
          p2={props.mapContext.pointerPosition}
          borderColor="red"
        />
      </>
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
};
