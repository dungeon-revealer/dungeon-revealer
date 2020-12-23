import * as React from "react";
import { animated, useSpring } from "@react-spring/three";
import * as io from "io-ts";
import { identity, pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import {
  PersistedStateModel,
  usePersistedState,
} from "../hooks/use-persisted-state";
import { usePinchWheelZoom } from "./drag-pan-zoom-map-tool";
import { MapTool } from "./map-tool";

const TokenMarkerStateModel = io.type({
  tokenRadius: io.number,
  tokenColor: io.string,
});

type TokenMarkerState = io.TypeOf<typeof TokenMarkerStateModel>;

type AddTokenFunction = (token: {
  color: string;
  radius: number;
  x: number;
  y: number;
}) => void;

type TokenMarkerContextValue = {
  state: TokenMarkerState;
  setState: React.Dispatch<React.SetStateAction<TokenMarkerState>>;
  addToken: AddTokenFunction;
};

export const TokenMarkerContext = React.createContext<TokenMarkerContextValue>(
  // TODO: use context that throws if no value is provided.
  undefined as any
);

const tokenMarkerPersistedStateModel: PersistedStateModel<TokenMarkerState> = {
  encode: (value) => JSON.stringify(value),
  decode: (value) =>
    pipe(
      io.string.decode(value),
      E.chainW((value) => E.parseJSON(value, E.toError)),
      E.chainW(TokenMarkerStateModel.decode),
      E.fold((err) => {
        if (value !== null) {
          console.log(
            "Error occured while trying to decode value.\n" +
              JSON.stringify(err, null, 2)
          );
        }

        return { tokenRadius: 100, tokenColor: "red" };
      }, identity)
    ),
};

export const TokenMarkerContextProvider = (props: {
  children: React.ReactNode;
  addToken: AddTokenFunction;
}): React.ReactElement => {
  const [state, setState] = usePersistedState(
    "tokenMarkerMapToolSettings",
    tokenMarkerPersistedStateModel
  );
  return (
    <TokenMarkerContext.Provider
      value={{ state, setState, addToken: props.addToken }}
    >
      {props.children}
    </TokenMarkerContext.Provider>
  );
};

export const TokenMarkerMapTool: MapTool = {
  id: "token-marker-map-tool",
  Component: (props) => {
    usePinchWheelZoom(props.mapContext);
    const tokenMarkerContext = React.useContext(TokenMarkerContext);

    props.useMapGesture({
      onDrag: ({ movement, memo, event, tap }) => {
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

        if (tap) {
          // TODO: investigate why the typings are wrong here.
          // @ts-ignore
          const point: THREE.Vector3 = event.point;
          const [x, y] = props.mapContext.helper.threePointToImageCoordinates([
            point.x,
            point.y,
          ]);

          tokenMarkerContext.addToken({
            color: tokenMarkerContext.state.tokenColor,
            radius: tokenMarkerContext.state.tokenRadius,
            x,
            y,
          });
        }
      },
    });

    const { radius } = useSpring({
      radius: React.useMemo(() => {
        const [width] = props.mapContext.helper.vector.canvasToThree(
          props.mapContext.helper.vector.imageToCanvas([
            tokenMarkerContext.state.tokenRadius,
            tokenMarkerContext.state.tokenRadius,
          ])
        );
        return width;
      }, [tokenMarkerContext.state.tokenRadius]),
    });

    return (
      <animated.mesh
        position={props.mapContext.pointerPosition}
        scale={radius.to((radius) => [radius, radius, radius])}
      >
        <ringBufferGeometry attach="geometry" args={[1 - 0.05, 1, 128]} />
        <meshStandardMaterial
          attach="material"
          color={tokenMarkerContext.state.tokenColor}
          transparent
        />
      </animated.mesh>
    );
  },
};
