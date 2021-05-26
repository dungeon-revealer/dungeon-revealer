import * as React from "react";
import { animated, SpringValue } from "@react-spring/three";
import * as io from "io-ts";
import { identity, pipe } from "fp-ts/function";
import * as E from "fp-ts/Either";
import graphql from "babel-plugin-relay/macro";
import { useMutation } from "relay-hooks";
import {
  PersistedStateModel,
  usePersistedState,
} from "../hooks/use-persisted-state";
import { usePinchWheelZoom } from "./drag-pan-zoom-map-tool";
import { MapTool } from "./map-tool";
import { tokenMarkerMapToolMapTokeMapTokenAddManyMutation } from "./__generated__/tokenMarkerMapToolMapTokeMapTokenAddManyMutation.graphql";

const TokenMarkerStateModel = io.type({
  tokenRadius: io.number,
  tokenColor: io.string,
  tokenText: io.string,
  includeTokenText: io.boolean,
  tokenCounter: io.number,
  /* whether the value of tokenCounter should be appended to the tokenText */
  includeTokenCounter: io.boolean,
});

type TokenMarkerState = {
  tokenRadius: SpringValue<number>;
  tokenColor: string;
  tokenText: string;
  includeTokenText: boolean;
  tokenCounter: number;
  includeTokenCounter: boolean;
};

type TokenMarkerContextValue = {
  state: TokenMarkerState;
  setState: React.Dispatch<React.SetStateAction<TokenMarkerState>>;
  currentMapId: string;
};

export const TokenMarkerContext = React.createContext<TokenMarkerContextValue>(
  // TODO: use context that throws if no value is provided.
  undefined as any
);

const createDefaultTokenMarkerState = (): TokenMarkerState => ({
  tokenColor: "#000000",
  tokenRadius: new SpringValue({ from: 100 }),
  tokenText: "",
  includeTokenText: false,
  tokenCounter: 1,
  includeTokenCounter: false,
});

const tokenMarkerPersistedStateModel: PersistedStateModel<TokenMarkerState> = {
  encode: ({ tokenRadius, ...value }) =>
    JSON.stringify({ ...value, tokenRadius: tokenRadius.get() }),
  decode: (value) =>
    pipe(
      io.string.decode(value),
      E.chainW((value) => E.parseJSON(value, E.toError)),
      E.chainW(TokenMarkerStateModel.decode),
      E.map((value) => ({
        ...value,
        tokenRadius: new SpringValue({ from: value.tokenRadius }),
      })),
      E.fold((err) => {
        if (value !== null) {
          console.log(
            "Error occurred while trying to decode value.\n" +
              JSON.stringify(err, null, 2)
          );
        }

        return createDefaultTokenMarkerState();
      }, identity)
    ),
};

export const TokenMarkerContextProvider = (props: {
  children: React.ReactNode;
  currentMapId: string;
}): React.ReactElement => {
  const [state, setState] = usePersistedState(
    "tokenMarkerMapToolSettings",
    tokenMarkerPersistedStateModel
  );
  return (
    <TokenMarkerContext.Provider
      value={{ state, setState, currentMapId: props.currentMapId }}
    >
      {props.children}
    </TokenMarkerContext.Provider>
  );
};

const TokenMarkerMapToolMapTokenAddManyMutation = graphql`
  mutation tokenMarkerMapToolMapTokeMapTokenAddManyMutation(
    $input: MapTokenAddManyInput!
  ) {
    mapTokenAddMany(input: $input)
  }
`;

export const TokenMarkerMapTool: MapTool = {
  id: "token-marker-map-tool",
  Component: (props) => {
    usePinchWheelZoom(props.mapContext);
    const tokenMarkerContext = React.useContext(TokenMarkerContext);

    const [addToken] =
      useMutation<tokenMarkerMapToolMapTokeMapTokenAddManyMutation>(
        TokenMarkerMapToolMapTokenAddManyMutation
      );

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

        if (tap && event.button === 0) {
          // TODO: investigate why the typings are wrong here.
          // @ts-ignore
          const point: THREE.Vector3 = event.point;
          const [x, y] = props.mapContext.helper.threePointToImageCoordinates([
            point.x,
            point.y,
          ]);

          let label = "";

          if (tokenMarkerContext.state.includeTokenText) {
            label = tokenMarkerContext.state.tokenText;
          }

          if (tokenMarkerContext.state.includeTokenCounter) {
            label = `${label} ${tokenMarkerContext.state.tokenCounter}`;
            tokenMarkerContext.setState((state) => ({
              ...state,
              tokenCounter: state.tokenCounter + 1,
            }));
          }

          addToken({
            variables: {
              input: {
                mapId: tokenMarkerContext.currentMapId,
                tokens: [
                  {
                    color: tokenMarkerContext.state.tokenColor,
                    radius: tokenMarkerContext.state.tokenRadius.get(),
                    x,
                    y,
                    label: label.trim(),
                  },
                ],
              },
            },
          });
        }
      },
    });

    return (
      <animated.mesh
        position={props.mapContext.pointerPosition}
        scale={tokenMarkerContext.state.tokenRadius.to((radius) => {
          const [width] = props.mapContext.helper.vector.canvasToThree(
            props.mapContext.helper.vector.imageToCanvas([radius, radius])
          );

          return [width, width, width];
        })}
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
