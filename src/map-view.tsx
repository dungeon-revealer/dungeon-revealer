import * as React from "react";
import * as THREE from "three";
import graphql from "babel-plugin-relay/macro";
// import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import {
  Canvas,
  PointerEvent,
  useFrame,
  useLoader,
  useThree,
  ViewportData,
} from "react-three-fiber";
import { animated, useSpring, SpringValue, to } from "@react-spring/three";
import { useGesture } from "react-use-gesture";
import styled from "@emotion/styled/macro";
import { darken, lighten } from "polished";
import { getOptimalDimensions } from "./util";
import { useStaticRef } from "./hooks/use-static-ref";
import { buildUrl } from "./public-url";
import { CanvasText, CanvasTextRef } from "./canvas-text";
import type {
  MapTool,
  MapToolMapGestureHandlers,
  SharedMapToolState,
} from "./map-tools/map-tool";
import { useContextBridge } from "./hooks/use-context-bridge";
import { MapGridEntity, MapTokenEntity, MarkedAreaEntity } from "./map-typings";
import { useIsKeyPressed } from "./hooks/use-is-key-pressed";
import { useNoteWindowActions } from "./dm-area/token-info-aside";
import { TextureLoader } from "three";
import { ReactEventHandlers } from "react-use-gesture/dist/types";
import { useQuery } from "relay-hooks";
import { mapView_TokenImageQuery } from "./__generated__/mapView_TokenImageQuery.graphql";
import { buttonGroup, useControls, useCreateStore } from "leva";
import { StoreType } from "leva/dist/declarations/src/types";
import { levaPluginNoteReference } from "./leva-plugin/leva-plugin-note-reference";
import { levaPluginTokenImage } from "./leva-plugin/leva-plugin-token-image";
import { useCurrent } from "./hooks/use-current";

type Vector2D = [number, number];

enum LayerRenderOrder {
  map = 0,
  mapGrid = 1,
  token = 2,
  tokenTextBackground = 3,
  tokenText = 4,
  tokenGesture = 5,
  marker = 6,
}

// convert image relative to three.js
const calculateX = (x: number, factor: number, dimensionsWidth: number) =>
  x * factor - dimensionsWidth / 2;

const calculateY = (y: number, factor: number, dimensionsHeight: number) =>
  -y * factor + dimensionsHeight / 2;

// convert three.js to image relative
const calculateRealX = (x: number, factor: number, dimensionsWidth: number) =>
  (x + dimensionsWidth / 2) / factor;

const calculateRealY = (y: number, factor: number, dimensionsHeight: number) =>
  ((y - dimensionsHeight / 2) / factor) * -1;

export type Dimensions = { width: number; height: number; ratio: number };

const Plane = React.forwardRef(
  (
    {
      children,
      position,
      scale,
      ...props
    }: {
      position: SpringValue<[number, number, number]>;
      scale: SpringValue<[number, number, number]>;
      children: React.ReactNode;
    },
    ref: React.ForwardedRef<THREE.Mesh>
  ) => {
    const showContextMenu = React.useContext(ContextMenuContext);
    const sharedMapState = React.useContext(SharedMapState);

    return (
      <animated.group
        position={position}
        scale={scale}
        onContextMenu={(event) => {
          event.stopPropagation();
          event.nativeEvent.stopPropagation();
          event.nativeEvent.preventDefault();

          const [
            imageX,
            imageY,
          ] = sharedMapState.helper.threePointToImageCoordinates([
            event.point.x,
            event.point.y,
          ]);
          const state: ContextMenuState = {
            clientPosition: {
              x: event.clientX,
              y: event.clientY,
            },
            imagePosition: {
              x: imageX,
              y: imageY,
            },
            target: null,
          };
          setTimeout(() => {
            showContextMenu(state);
          });
        }}
      >
        <mesh ref={ref} {...props}>
          <planeBufferGeometry attach="geometry" args={[10000, 10000]} />
          <meshBasicMaterial attach="material" color="black" />
        </mesh>
        {children}
      </animated.group>
    );
  }
);

const MapTokenImageQuery = graphql`
  query mapView_TokenImageQuery($id: ID!) {
    tokenImage: node(id: $id) {
      __typename
      ... on TokenImage {
        id
        url
      }
    }
  }
`;

export const SetSelectedTokenStoreContext = React.createContext<
  (value: StoreType | null) => void
>(() => undefined);

export const UpdateTokenContext = React.createContext<
  (id: string, props: Omit<Partial<MapTokenEntity>, "id">) => void
>(() => undefined);
const SharedMapState = React.createContext<SharedMapToolState>(
  undefined as any
);
export const IsDungeonMasterContext = React.createContext(false);

export type ContextMenuState = {
  clientPosition: {
    x: number;
    y: number;
  };
  imagePosition: {
    x: number;
    y: number;
  };
  target: null | {
    type: "token";
    id: string;
  };
} | null;

export const ContextMenuContext = React.createContext(
  (_props: ContextMenuState) => undefined as void
);

const TokenRenderer: React.FC<{
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  textLabel: string;
  isLocked: boolean;
  isMovableByPlayers: boolean;
  isVisibleForPlayers: boolean;
  reference: null | { type: "note"; id: string };
  tokenImageId: string | null;
  columnWidth: number | null;
}> = (props) => {
  const sharedMapState = React.useContext(SharedMapState);

  const query = useQuery<mapView_TokenImageQuery>(
    MapTokenImageQuery,
    props.tokenImageId
      ? {
          id: props.tokenImageId,
        }
      : undefined,
    { skip: props.tokenImageId === null }
  );
  const [, cachedQueryResult] = useCurrent(
    query,
    !query.error && !query.data,
    0
  );

  const latestTokenProps = React.useRef(props);

  const updateToken = React.useContext(UpdateTokenContext);

  const [isDragging, setIsDragging] = React.useState(false);
  const isDraggingRef = React.useRef(isDragging);
  React.useEffect(() => {
    isDraggingRef.current = isDragging;
  });
  const store = useCreateStore();
  const updateRadiusRef = React.useRef<null | ((radius: number) => void)>(null);
  const [values, setValues] = useControls(
    () => ({
      position: {
        label: "Position",
        value: [props.x, props.y],
        step: 1,
        onChange: (value: [number, number]) => {
          set({
            position: [
              ...sharedMapState.helper.imageCoordinatesToThreePoint(value),
              0,
            ],
            immediate: isDraggingRef.current,
          });

          if (
            latestTokenProps.current.x === value[0] &&
            latestTokenProps.current.y === value[1]
          ) {
            return;
          }

          updateToken(props.id, {
            x: value[0],
            y: value[1],
          });
        },
      },
      radius: {
        label: "Size",
        value: props.radius,
        step: 1,
        min: 1,
        onChange: (value: number) => {
          const newRadius = sharedMapState.helper.size.fromImageToThree(value);

          set({
            circleScale: [
              newRadius / initialRadius,
              newRadius / initialRadius,
              1,
            ],
          });

          if (latestTokenProps.current.radius === value) {
            return;
          }

          updateToken(props.id, {
            radius: value,
          });
        },
      },
      "": buttonGroup({
        "0.25x": () => updateRadiusRef.current?.(0.25),
        "0.5x": () => updateRadiusRef.current?.(0.5),
        "1x": () => updateRadiusRef.current?.(1),
        "2x": () => updateRadiusRef.current?.(2),
        "3x": () => updateRadiusRef.current?.(3),
      }),
      isLocked: {
        label: "Position locked",
        value: props.isLocked,
      },
      text: {
        label: "Title",
        value: typeof props.textLabel === "string" ? props.textLabel : "",
      },
      color: {
        label: "Color",
        value: props.color ?? "rgb(255, 255, 255)",
      },
      isVisibleForPlayers: {
        label: "Visible to players",
        value: props.isVisibleForPlayers,
      },
      isMovableByPlayers: {
        label: "Movable by players",
        value: props.isMovableByPlayers,
      },
      reference: levaPluginNoteReference({
        value: props.reference?.id ?? null,
      }),
      tokenImageId: levaPluginTokenImage({
        value: props.tokenImageId,
      }),
    }),
    { store }
  );

  useControls(
    {
      text: {
        value: props.textLabel,
        onChange: (label: string) => {
          if (latestTokenProps.current.textLabel === label) {
            return;
          }
          updateToken(props.id, {
            label,
          });
        },
      },
      isLocked: {
        value: props.isLocked,
        onChange: (isLocked: boolean) => {
          if (latestTokenProps.current.isLocked === isLocked) {
            return;
          }
          updateToken(props.id, {
            isLocked,
          });
        },
      },
      color: {
        value: "rgb(255, 255, 255)",
        onChange: (color: string) => {
          if (latestTokenProps.current.color === color) {
            return;
          }
          updateToken(props.id, {
            color,
          });
        },
      },
      isVisibleForPlayers: {
        value: props.isVisibleForPlayers,
        onChange: (isVisibleForPlayers: boolean) => {
          if (
            latestTokenProps.current.isVisibleForPlayers === isVisibleForPlayers
          ) {
            return;
          }
          updateToken(props.id, {
            isVisibleForPlayers,
          });
        },
      },
      isMovableByPlayers: {
        value: props.isMovableByPlayers,
        onChange: (isMovableByPlayers: boolean) => {
          if (
            latestTokenProps.current.isMovableByPlayers === isMovableByPlayers
          ) {
            return;
          }
          updateToken(props.id, {
            isMovableByPlayers,
          });
        },
      },
      reference: levaPluginNoteReference({
        value: props.reference?.id ?? null,
        // @ts-ignore
        onChange: (referenceId: null | string) => {
          if (
            (latestTokenProps.current.reference?.id ?? null) === referenceId
          ) {
            return;
          }
          updateToken(props.id, {
            reference: referenceId ? { type: "note", id: referenceId } : null,
          });
        },
      }),
      tokenImageId: levaPluginTokenImage({
        value: props.tokenImageId,
        // @ts-ignore
        onChange: (tokenImageId: null | string) => {
          if (latestTokenProps.current.tokenImageId === tokenImageId) {
            return;
          }

          updateToken(props.id, {
            tokenImageId,
          });
        },
      }),
    },
    { store }
  );

  React.useEffect(() => {
    updateRadiusRef.current = (value) =>
      setValues({ radius: ((props.columnWidth ?? 50) / 2) * value * 0.9 });
  });

  React.useEffect(() => {
    setValues({
      position: [props.x, props.y],
      radius: props.radius,
      text: props.textLabel,
      isLocked: props.isLocked,
      color: props.color,
      isMovableByPlayers: props.isMovableByPlayers,
      isVisibleForPlayers: props.isVisibleForPlayers,
      reference: props.reference?.id ?? null,
      tokenImageId: props.tokenImageId,
    });
  }, [
    setValues,
    props.x,
    props.y,
    props.radius,
    props.textLabel,
    props.isLocked,
    props.color,
    props.isMovableByPlayers,
    props.isVisibleForPlayers,
    props.reference?.id,
    props.tokenImageId,
  ]);

  React.useEffect(() => {
    latestTokenProps.current = props;
  });

  const setStore = React.useContext(SetSelectedTokenStoreContext);

  const initialRadius = useStaticRef(() =>
    sharedMapState.helper.size.fromImageToThree(Math.max(1, props.radius))
  );

  const isDungeonMaster = React.useContext(IsDungeonMasterContext);
  const isMovable =
    (isDungeonMaster === true || values.isMovableByPlayers === true) &&
    values.isLocked === false;
  const isLocked = values.isLocked;

  const [isHover, setIsHover] = React.useState(false);

  const [animatedProps, set] = useSpring(() => ({
    position: [
      ...sharedMapState.helper.imageCoordinatesToThreePoint([props.x, props.y]),
      0,
    ] as [number, number, number],
    circleScale: [1, 1, 1] as [number, number, number],
  }));

  React.useEffect(() => {
    if (isLocked === false) {
      setIsHover(false);
    }
  }, [isLocked]);

  const noteWindowActions = useNoteWindowActions();

  const onPointerDown = React.useRef<null | (() => void)>(null);

  const hoverCounter = React.useRef(0);

  const showContextMenu = React.useContext(ContextMenuContext);

  const dragProps = useGesture<{
    onClick: PointerEvent;
    onContextMenu: PointerEvent;
    onDrag: PointerEvent;
    onPointerDown: PointerEvent;
  }>(
    {
      onDrag: ({
        event,
        movement,
        memo = animatedProps.position.get(),
        last,
        tap,
      }) => {
        setStore(store);
        setIsDragging(!last);

        // onClick replacement
        // events are handled different in react-three-fiber
        // @dbismut advised me that checking for tap in onDrag
        // is the best solution when having both drag and click behavior.
        if (tap) {
          if (onPointerDown.current) {
            onPointerDown.current();
            // left mouse
            if (event.button === 0) {
              if (props.reference) {
                noteWindowActions.focusOrShowNoteInNewWindow(
                  props.reference.id
                );
              }
            }

            if (event.button === 2) {
              const [
                imageX,
                imageY,
              ] = sharedMapState.helper.threePointToImageCoordinates([
                // TODO: figure out why the point is not in the typings.
                // @ts-ignore
                event.point.x,
                // @ts-ignore
                event.point.y,
              ]);
              const state: ContextMenuState = {
                clientPosition: {
                  x: event.clientX,
                  y: event.clientY,
                },
                imagePosition: {
                  x: imageX,
                  y: imageY,
                },
                target: {
                  type: "token",
                  id: props.id,
                },
              };
              setTimeout(() => {
                showContextMenu(state);
              });
            }
          }

          setIsHover(() => false);
          return;
        }

        if (isMovable === false) {
          return;
        }

        onPointerDown.current?.();
        event.stopPropagation();

        const mapScale = sharedMapState.mapState.scale.get();
        const newX =
          memo[0] + movement[0] / sharedMapState.viewport.factor / mapScale[0];
        const newY =
          memo[1] - movement[1] / sharedMapState.viewport.factor / mapScale[1];

        const [x, y] = sharedMapState.helper.coordinates.canvasToImage(
          sharedMapState.helper.coordinates.threeToCanvas([newX, newY])
        );

        setValues({
          // @ts-ignore
          position: [x, y],
        });

        return memo;
      },
      onPointerDown: ({ event }) => {
        const timeout = setTimeout(() => {
          onPointerDown.current = null;
          setStore(store);
        }, 1000);
        onPointerDown.current = () => clearTimeout(timeout);

        if (isMovable === false) {
          return;
        }
        if (isLocked === false) {
          event.stopPropagation();
        }
      },
      onPointerOver: () => {
        hoverCounter.current++;
        if (isMovable === false) {
          return;
        }
        if (isLocked === false) {
          setIsHover(hoverCounter.current !== 0);
        }
      },
      onPointerUp: () => {
        setIsDragging(false);
        onPointerDown.current?.();

        if (isMovable === false) {
          return;
        }
      },
      onPointerOut: () => {
        setIsDragging(false);
        hoverCounter.current--;

        if (isMovable === false) {
          return;
        }
        setIsHover(hoverCounter.current !== 0);
      },
      onContextMenu: (args) => {
        args.event.stopPropagation();
        args.event.nativeEvent.preventDefault();
      },
    },
    {
      drag: {
        filterTaps: true,
      },
    }
  );

  const color =
    isHover && isMovable ? lighten(0.1, values.color) : values.color;
  const textLabel = values.text;

  return (
    <>
      <animated.group
        position={animatedProps.position}
        scale={animatedProps.circleScale}
        renderOrder={LayerRenderOrder.token}
      >
        {props.tokenImageId && cachedQueryResult?.data?.tokenImage ? null : (
          <>
            <mesh>
              <circleBufferGeometry
                attach="geometry"
                args={[initialRadius, 128]}
              />
              <meshStandardMaterial
                attach="material"
                color={color}
                transparent={true}
                opacity={values.isVisibleForPlayers ? 1 : 0.5}
              />
            </mesh>
            <mesh>
              <ringBufferGeometry
                attach="geometry"
                args={[initialRadius * (1 - 0.05), initialRadius, 128]}
              />
              <meshStandardMaterial
                attach="material"
                color={darken(0.1, color)}
                opacity={values.isVisibleForPlayers ? 1 : 0.5}
                transparent={true}
              />
            </mesh>
          </>
        )}
        {props.tokenImageId &&
        cachedQueryResult?.data?.tokenImage &&
        cachedQueryResult.data.tokenImage.__typename === "TokenImage" ? (
          <TokenAttachment
            url={cachedQueryResult.data.tokenImage.url}
            initialRadius={initialRadius}
            dragProps={dragProps}
            isHover={isHover}
            opacity={values.isVisibleForPlayers ? 1 : 0.5}
          />
        ) : null}
        {props.tokenImageId && cachedQueryResult?.data?.tokenImage ? null : (
          <mesh {...dragProps()} renderOrder={LayerRenderOrder.tokenGesture}>
            {/* This one is for attaching the gesture handlers */}
            <circleBufferGeometry
              attach="geometry"
              args={[initialRadius, 128]}
            />
            <meshStandardMaterial
              attach="material"
              color={color}
              opacity={0}
              transparent={true}
            />
          </mesh>
        )}
      </animated.group>
      {/* Text should not be scaled and thus must be moved to a separate group. */}
      {textLabel ? (
        <animated.group
          position={to(
            [animatedProps.circleScale, animatedProps.position],
            ([scale], [x, y, z]) =>
              query.data?.tokenImage
                ? [x, y - 0.04 - initialRadius * scale, z]
                : [x, y, z]
          )}
          renderOrder={LayerRenderOrder.token}
        >
          <TokenLabel
            text={textLabel}
            position={undefined}
            backgroundColor={query.data?.tokenImage ? "#ffffff" : null}
          />
        </animated.group>
      ) : null}
    </>
  );
};

function arrayEquals(a: unknown, b: unknown) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.every((val, index) => val === b[index])
  );
}

const TokenLabel = (props: {
  text: string;
  position?: [number, number, number];
  backgroundColor: null | string;
}) => {
  const [blockBounds, setBlockBounds] = React.useState<
    [number, number, number, number] | null
  >(null);

  const textRef = React.useRef<CanvasTextRef | null>(null);
  const lastBlockBounds = React.useRef(blockBounds);
  React.useEffect(() => {
    lastBlockBounds.current = blockBounds;
  });

  useFrame(() => {
    if (!props.backgroundColor) {
      return;
    }
    if (
      lastBlockBounds.current === null ||
      arrayEquals(
        textRef.current?.textRenderInfo?.blockBounds,
        lastBlockBounds.current
      ) === false
    ) {
      setBlockBounds(
        textRef.current?.textRenderInfo?.blockBounds
          ? [...textRef.current.textRenderInfo.blockBounds]
          : null
      );
    }
  });

  return (
    <>
      {blockBounds && props.backgroundColor ? (
        <mesh
          renderOrder={LayerRenderOrder.tokenTextBackground}
          position={props.position}
        >
          <planeBufferGeometry
            attach="geometry"
            args={[
              Math.abs(blockBounds[0]) + Math.abs(blockBounds[2]) + 0.01,
              Math.abs(blockBounds[1]) + Math.abs(blockBounds[3]),
              1,
            ]}
          />
          <meshStandardMaterial
            attach="material"
            color={props.backgroundColor}
            transparent={true}
          />
        </mesh>
      ) : null}

      <CanvasText
        fontSize={0.06}
        color="black"
        font={buildUrl("/fonts/Roboto-Bold.ttf")}
        anchorX="center"
        anchorY="middle"
        position={props.position}
        renderOrder={LayerRenderOrder.tokenText}
        ref={textRef}
      >
        {props.text}
      </CanvasText>
    </>
  );
};

const TokenAttachment = (props: {
  url: string;
  initialRadius: number;
  isHover: boolean;
  opacity: number;
  dragProps: () => ReactEventHandlers;
}) => {
  return (
    <React.Suspense fallback={null}>
      {/* {props.file.type.includes("svg") ? (
        <SVGELement
          url={url}
          dragProps={props.dragProps}
          isHover={props.isHover}
          opacity={props.opacity}
          initialRadius={props.initialRadius}
        />
      ) : */}
      <TextureElement
        url={props.url}
        dragProps={props.dragProps}
        initialRadius={props.initialRadius}
        isHover={props.isHover}
        opacity={props.opacity}
      />
    </React.Suspense>
  );
};

const TextureElement = (props: {
  url: string;
  dragProps: () => ReactEventHandlers;
  initialRadius: number;
  isHover: boolean;
  opacity: number;
}) => {
  const texture = useLoader(TextureLoader, props.url);

  return (
    <mesh renderOrder={LayerRenderOrder.tokenGesture} {...props.dragProps()}>
      <circleBufferGeometry
        attach="geometry"
        args={[props.initialRadius, 128]}
      />
      <meshBasicMaterial
        attach="material"
        map={texture}
        transparent={true}
        opacity={props.isHover ? props.opacity + 0.1 : props.opacity}
      />
    </mesh>
  );
};

// const SVGELement = (props: {
//   url: string;
//   dragProps: () => ReactEventHandlers;
//   isHover: boolean;
//   opacity: number;
//   initialRadius: number;
// }) => {
//   const data = useLoader(SVGLoader, props.url);

//   let i = 0;
//   const items: Array<React.ReactElement> = [];

//   const width = ((data.xml as any) as SVGSVGElement).viewBox.baseVal.width;
//   const height = ((data.xml as any) as SVGSVGElement).viewBox.baseVal.height;

//   for (const path of data.paths) {
//     for (const shape of path.toShapes(true)) {
//       i++;
//       items.push(
//         <mesh
//           key={i}
//           renderOrder={LayerRenderOrder.token}
//           {...props.dragProps()}
//         >
//           <shapeBufferGeometry args={[shape]} />
//           <meshBasicMaterial
//             color={
//               props.isHover
//                 ? lighten(0.1, "#" + path.color.getHexString())
//                 : path.color
//             }
//             side={THREE.DoubleSide}
//             transparent={true}
//           />
//         </mesh>
//       );
//     }
//   }

//   const scale = (props.initialRadius * 2) / width;

//   return (
//     <group
//       scale={[scale, -scale, scale]}
//       position={[(-width / 2) * scale, (height / 2) * scale, 0]}
//     >
//       {items}
//     </group>
//   );
// };

const MarkedAreaRenderer: React.FC<{
  x: number;
  y: number;
  factor: number;
  dimensions: Dimensions;
  remove: () => void;
  radius: number;
}> = (props) => {
  const initialRadius = 10 * props.factor;

  const spring = useSpring({
    from: {
      scale: [1, 1, 1] as [number, number, number],
      opacity: 1,
    },
    to: {
      scale: [props.radius, props.radius, props.radius] as [
        number,
        number,
        number
      ],
      opacity: 0,
    },
    config: {
      duration: 2000,
    },
    onRest: () => {
      props.remove();
    },
  });

  return (
    <animated.mesh
      scale={spring.scale}
      position={[
        calculateX(props.x, props.factor, props.dimensions.width),
        calculateY(props.y, props.factor, props.dimensions.height),
        0,
      ]}
    >
      <ringBufferGeometry
        attach="geometry"
        args={[initialRadius * (1 - 0.05), initialRadius, 128]}
      />
      <animated.meshStandardMaterial
        attach="material"
        color={"red"}
        transparent
        opacity={spring.opacity}
      />
    </animated.mesh>
  );
};

const reduceOffsetToMinimum = (offset: number, sideLength: number): number => {
  const newOffset = offset - sideLength;
  if (newOffset > 0) {
    return reduceOffsetToMinimum(newOffset, sideLength);
  }
  return offset;
};

const drawGridToContext = (
  grid: MapGridEntity,
  ratio: number,
  canvas: HTMLCanvasElement
) => {
  const context = canvas.getContext("2d");
  if (!context) {
    console.error("Could not create canvas context.");
    return;
  }
  context.strokeStyle = grid.color || "rgba(0, 0, 0, .5)";
  context.lineWidth = 2;

  const gridX = grid.offsetX * ratio;
  const gridY = grid.offsetY * ratio;
  const sideWidth = grid.columnWidth * ratio;
  const sideHeight = grid.columnHeight * ratio;

  const offsetX = reduceOffsetToMinimum(gridX, sideWidth);
  const offsetY = reduceOffsetToMinimum(gridY, sideHeight);

  for (let i = 0; i < canvas.width / sideWidth; i++) {
    context.beginPath();
    context.moveTo(offsetX + i * sideWidth, 0);
    context.lineTo(offsetX + i * sideWidth, canvas.height);
    context.stroke();
  }
  for (let i = 0; i < canvas.height / sideHeight; i++) {
    context.beginPath();
    context.moveTo(0, offsetY + i * sideHeight);
    context.lineTo(canvas.width, offsetY + i * sideHeight);
    context.stroke();
  }
};

const GridRenderer = (props: {
  grid: MapGridEntity;
  dimensions: Dimensions;
  factor: number;
  imageHeight: number;
  imageWidth: number;
}): React.ReactElement => {
  const three = useThree();
  const maximumTextureSize = three.gl.capabilities.maxTextureSize;
  const [gridCanvas] = React.useState(() =>
    window.document.createElement("canvas")
  );
  const [gridTexture] = React.useState(
    () => new THREE.CanvasTexture(gridCanvas)
  );

  // maximumSideLength * maximumSideLength = MAXIMUM_TEXTURE_SIZE * 1024
  const maximumSideLength = React.useMemo(() => {
    return Math.sqrt(maximumTextureSize * 1024);
  }, [maximumTextureSize]);

  React.useEffect(() => {
    const { width, height, ratio } = getOptimalDimensions(
      props.imageWidth,
      props.imageHeight,
      maximumSideLength,
      maximumSideLength
    );
    gridCanvas.width = width;
    gridCanvas.height = height;
    drawGridToContext(props.grid, ratio, gridCanvas);
    gridTexture.needsUpdate = true;
  }, [
    gridCanvas,
    maximumSideLength,
    props.factor,
    props.imageWidth,
    props.imageHeight,
    props.grid,
  ]);

  return (
    <mesh renderOrder={LayerRenderOrder.mapGrid}>
      <planeBufferGeometry
        attach="geometry"
        args={[props.dimensions.width, props.dimensions.height]}
      />
      <meshStandardMaterial
        attach="material"
        map={gridTexture}
        transparent={true}
      />
    </mesh>
  );
};

const MapRenderer: React.FC<{
  mapImage: HTMLImageElement;
  mapImageTexture: THREE.Texture;
  fogTexture: THREE.Texture;
  viewport: ViewportData;
  tokens: MapTokenEntity[];
  markedAreas: MarkedAreaEntity[];
  removeMarkedArea: (id: string) => void;
  grid: MapGridEntity | null;
  scale: SpringValue<[number, number, number]>;
  factor: number;
  dimensions: Dimensions;
  fogOpacity: number;
  markerRadius: number;
}> = (props) => {
  return (
    <>
      <group renderOrder={LayerRenderOrder.map}>
        <mesh>
          <planeBufferGeometry
            attach="geometry"
            args={[props.dimensions.width, props.dimensions.height]}
          />
          <meshStandardMaterial attach="material" map={props.mapImageTexture} />
        </mesh>
        {props.grid ? (
          <GridRenderer
            grid={props.grid}
            dimensions={props.dimensions}
            factor={props.factor}
            imageHeight={props.mapImage.naturalHeight}
            imageWidth={props.mapImage.naturalWidth}
          />
        ) : null}
        <mesh>
          <planeBufferGeometry
            attach="geometry"
            args={[props.dimensions.width, props.dimensions.height]}
          />
          <meshBasicMaterial
            attach="material"
            map={props.fogTexture}
            transparent={true}
            opacity={props.fogOpacity}
          />
        </mesh>
      </group>
      <group renderOrder={LayerRenderOrder.token}>
        {props.tokens.map((token) => (
          <TokenRenderer
            id={token.id}
            key={token.id}
            x={token.x}
            y={token.y}
            color={token.color}
            textLabel={token.label}
            isLocked={token.isLocked}
            isMovableByPlayers={token.isMovableByPlayers}
            isVisibleForPlayers={token.isVisibleForPlayers}
            radius={token.radius}
            reference={token.reference}
            tokenImageId={token.tokenImageId}
            columnWidth={props.grid?.columnWidth ?? null}
          />
        ))}
      </group>
      <group renderOrder={LayerRenderOrder.marker}>
        {props.markedAreas.map((markedArea) => (
          <MarkedAreaRenderer
            key={markedArea.id}
            x={markedArea.x}
            y={markedArea.y}
            factor={props.factor}
            dimensions={props.dimensions}
            remove={() => props.removeMarkedArea(markedArea.id)}
            radius={props.markerRadius}
          />
        ))}
      </group>
    </>
  );
};

export type MapControlInterface = {
  controls: {
    center: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
  };
  getContext: () => SharedMapToolState;
};

const MapViewRenderer = (props: {
  mapImage: HTMLImageElement;
  fogImage: HTMLImageElement | null;
  tokens: MapTokenEntity[];
  controlRef?: React.MutableRefObject<MapControlInterface | null>;
  markedAreas: MarkedAreaEntity[];
  removeMarkedArea: (id: string) => void;
  grid: MapGridEntity | null;
  activeTool: MapTool | null;
  fogOpacity: number;
}): React.ReactElement => {
  const three = useThree();
  const viewport = three.viewport;
  const maximumTextureSize = three.gl.capabilities.maxTextureSize;

  const [spring, set] = useSpring(() => ({
    scale: [1, 1, 1] as [number, number, number],
    position: [0, 0, 0] as [number, number, number],
  }));

  // maximumSideLength * maximumSideLength = MAXIMUM_TEXTURE_SIZE * 1024
  const maximumSideLength = React.useMemo(() => {
    return Math.sqrt(maximumTextureSize * 1024);
  }, [maximumTextureSize]);

  const optimalDimensions = React.useMemo(
    () =>
      getOptimalDimensions(
        props.mapImage.naturalWidth,
        props.mapImage.naturalHeight,
        maximumSideLength,
        maximumSideLength
      ),
    [maximumSideLength, props.mapImage]
  );

  const [mapCanvas] = React.useState(() => {
    const canvas = window.document.createElement("canvas");
    canvas.width = optimalDimensions.width;
    canvas.height = optimalDimensions.height;
    return canvas;
  });
  const [fogCanvas] = React.useState(() => {
    const canvas = window.document.createElement("canvas");
    canvas.width = optimalDimensions.width;
    canvas.height = optimalDimensions.height;
    return canvas;
  });

  const [mapTexture] = React.useState(() => new THREE.CanvasTexture(mapCanvas));
  const [fogTexture] = React.useState(() => new THREE.CanvasTexture(fogCanvas));

  React.useEffect(() => {
    set({
      scale: [1, 1, 1],
      position: [0, 0, 0],
    });
  }, [mapTexture, set]);

  React.useEffect(() => {
    if (props.fogImage) {
      fogCanvas.width = optimalDimensions.width;
      fogCanvas.height = optimalDimensions.height;
      const context = fogCanvas.getContext("2d")!;
      context.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
      context.drawImage(
        props.fogImage,
        0,
        0,
        fogCanvas.width,
        fogCanvas.height
      );
    } else {
      const context = fogCanvas.getContext("2d")!;
      context.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    }
    fogTexture.needsUpdate = true;
  }, [optimalDimensions, fogCanvas, maximumSideLength, props.fogImage]);

  React.useEffect(() => {
    mapCanvas.width = optimalDimensions.width;
    mapCanvas.height = optimalDimensions.height;
    const context = mapCanvas.getContext("2d")!;
    context.drawImage(props.mapImage, 0, 0, mapCanvas.width, mapCanvas.height);
    mapTexture.needsUpdate = true;
  }, [optimalDimensions, props.mapImage, mapCanvas, maximumSideLength]);

  const dimensions = React.useMemo(() => {
    return getOptimalDimensions(
      props.mapImage.naturalWidth,
      props.mapImage.naturalHeight,
      viewport.width * 0.95,
      viewport.height * 0.95
    );
  }, [props.mapImage, viewport]);

  const isDragAllowed = React.useRef(true);

  const [pointerPosition] = React.useState(
    () => new SpringValue({ from: [0, 0, 0] as [number, number, number] })
  );

  const isAltPressed = useIsKeyPressed("Alt");

  const { size, raycaster, scene, camera } = useThree();

  const planeRef = React.useRef<THREE.Mesh | null>(null);

  const toolContext = React.useMemo<SharedMapToolState>(() => {
    const factor = dimensions.width / mapCanvas.width;

    const vector = {
      threeToCanvas: ([x, y]: Vector2D) => [x / factor, y / factor] as Vector2D,
      canvasToThree: ([x, y]: Vector2D) => [x * factor, y * factor] as Vector2D,
      canvasToImage: ([x, y]: Vector2D) =>
        [x / optimalDimensions.ratio, y / optimalDimensions.ratio] as Vector2D,
      imageToCanvas: ([x, y]: Vector2D) =>
        [x * optimalDimensions.ratio, y * optimalDimensions.ratio] as Vector2D,
    };

    const coordinates = {
      threeToCanvas: ([x, y]: Vector2D) =>
        [
          calculateRealX(x, factor, dimensions.width),
          calculateRealY(y, factor, dimensions.height),
        ] as Vector2D,
      canvasToThree: ([x, y]: Vector2D) =>
        [
          calculateX(x, factor, dimensions.width),
          calculateY(y, factor, dimensions.height),
        ] as Vector2D,
      canvasToImage: ([x, y]: Vector2D) =>
        [x / optimalDimensions.ratio, y / optimalDimensions.ratio] as Vector2D,
      imageToCanvas: ([x, y]: Vector2D) =>
        [x * optimalDimensions.ratio, y * optimalDimensions.ratio] as Vector2D,
      screenToImage: ([x, y]: Vector2D) => {
        if (!planeRef.current) {
          return [0, 0] as Vector2D;
        }
        const vector = new THREE.Vector2(
          (x / size.width) * 2 - 1,
          -(y / size.height) * 2 + 1
        );
        raycaster.setFromCamera(vector, camera);
        const [intersection] = raycaster.intersectObject(planeRef.current);
        if (!intersection) {
          return [0, 0] as Vector2D;
        }
        const [scale] = spring.scale.get();
        const [offsetX, offsetY] = spring.position.get();
        return coordinates.canvasToImage(
          coordinates.threeToCanvas([
            (intersection.point.x - offsetX) / scale,
            (intersection.point.y - offsetY) / scale,
          ])
        );
      },
    };

    return {
      mapCanvas,
      fogCanvas,
      fogTexture,
      mapState: spring,
      setMapState: set,
      dimensions,
      mapImage: props.mapImage,
      viewport,
      isDragAllowed,
      isAltPressed,
      pointerPosition,
      helper: {
        threePointToImageCoordinates: ([x, y]) => {
          const position = spring.position.get();
          const scale = spring.scale.get();

          return coordinates.canvasToImage(
            coordinates.threeToCanvas([
              (x - position[0]) / scale[0],
              (y - position[1]) / scale[1],
            ]) as Vector2D
          );
        },
        imageCoordinatesToThreePoint: ([x, y]: Vector2D) => {
          return coordinates.canvasToThree(coordinates.imageToCanvas([x, y]));
        },
        size: {
          fromImageToThree: (value: number) =>
            value * optimalDimensions.ratio * factor,
        },
        vector,
        coordinates,
      },
    };
  }, [
    fogCanvas,
    mapCanvas,
    fogTexture,
    spring,
    set,
    dimensions,
    props.mapImage,
    viewport,
    isDragAllowed,
    optimalDimensions,
    pointerPosition,
    isAltPressed,
    raycaster,
    scene,
  ]);

  React.useEffect(() => {
    if (props.controlRef) {
      props.controlRef.current = {
        controls: {
          center: () =>
            set({
              scale: [1, 1, 1] as [number, number, number],
              position: [0, 0, 0] as [number, number, number],
            }),
          zoomIn: () => {
            const scale = spring.scale.get();
            set({
              scale: [scale[0] * 1.1, scale[1] * 1.1, 1],
            });
          },
          zoomOut: () => {
            const scale = spring.scale.get();
            set({
              scale: [scale[0] / 1.1, scale[1] / 1.1, 1],
            });
          },
        },
        getContext: () => toolContext,
      };
    }

    return () => {
      if (props.controlRef) {
        props.controlRef.current = null;
      }
    };
  });

  const toolRef = React.useRef<{
    contextState: any;
    localState: any;
    handlers?: MapToolMapGestureHandlers;
  } | null>(null);

  const setStore = React.useContext(SetSelectedTokenStoreContext);

  const bind = useGesture<{
    onPointerUp: PointerEvent;
    onPointerDown: PointerEvent;
    onPointerMove: PointerEvent;
    onClick: PointerEvent;
    onKeyDown: KeyboardEvent;
  }>({
    onPointerDown: (args) => {
      setTimeout(() => setStore(null));
      toolRef.current?.handlers?.onPointerDown?.(args);
    },
    onPointerUp: (args) => toolRef.current?.handlers?.onPointerUp?.(args),
    onPointerMove: (args) => {
      const position = toolContext.mapState.position.get();
      const scale = toolContext.mapState.scale.get();

      pointerPosition.set([
        (args.event.point.x - position[0]) / scale[0],
        (args.event.point.y - position[1]) / scale[1],
        0,
      ]);

      return toolRef.current?.handlers?.onPointerMove?.(args);
    },
    onDrag: (args) => {
      if (isDragAllowed.current === false) {
        return;
      }
      return toolRef.current?.handlers?.onDrag?.(args);
    },
    onClick: (args) => toolRef.current?.handlers?.onClick?.(args),
  });

  return (
    <SharedMapState.Provider value={toolContext}>
      <Plane
        position={spring.position}
        scale={spring.scale}
        {...bind()}
        ref={planeRef}
      >
        <MapRenderer
          mapImage={props.mapImage}
          mapImageTexture={mapTexture}
          fogTexture={fogTexture}
          viewport={viewport}
          // TODO: Tokens and MarkedAreas are scaled to the image
          // the actual canvas size can differ, so we have to
          // calculate the coordinates relative to the canvas
          tokens={props.tokens.map((token) => ({
            ...token,
            radius: token.radius * optimalDimensions.ratio,
          }))}
          markerRadius={20}
          markedAreas={props.markedAreas.map((area) => ({
            ...area,
            x: area.x * optimalDimensions.ratio,
            y: area.y * optimalDimensions.ratio,
          }))}
          removeMarkedArea={props.removeMarkedArea}
          grid={props.grid}
          scale={spring.scale}
          dimensions={dimensions}
          factor={
            dimensions.width / props.mapImage.width / optimalDimensions.ratio
          }
          fogOpacity={props.fogOpacity}
        />
        {props.activeTool ? (
          <MapToolRenderer
            key={props.activeTool.id}
            tool={props.activeTool}
            toolRef={toolRef}
            handlerContext={toolContext}
          />
        ) : null}
      </Plane>
    </SharedMapState.Provider>
  );
};

const MapCanvasContainer = styled.div`
  height: 100%;
  touch-action: manipulation;
`;

export const MapView = (props: {
  mapImage: HTMLImageElement;
  fogImage: HTMLImageElement | null;
  tokens: MapTokenEntity[];
  controlRef?: React.MutableRefObject<MapControlInterface | null>;
  markedAreas: MarkedAreaEntity[];
  removeMarkedArea: (id: string) => void;
  grid: MapGridEntity | null;
  activeTool: MapTool | null;
  /* List of contexts that need to be proxied into R3F */
  sharedContexts: Array<React.Context<any>>;
  fogOpacity: number;
}): React.ReactElement => {
  const ContextBridge = useContextBridge(...props.sharedContexts);

  return (
    <MapCanvasContainer>
      <Canvas
        camera={{ position: [0, 0, 5] }}
        pixelRatio={window.devicePixelRatio}
        raycaster={{
          filter: (intersects, state) => {
            let sorted: THREE.Intersection[] = [];
            if (intersects.length > 0) {
              const closest = intersects[0];
              const outOfRange: THREE.Intersection[] = [];
              const inRange: THREE.Intersection[] = [];
              const ordered = intersects.sort(
                (i1, i2) => i2.object.renderOrder - i1.object.renderOrder
              );
              for (const intersect of ordered) {
                if (
                  Math.abs(closest.distance - intersect.distance) <=
                  (state.raycaster.params.Line?.threshold ?? 1)
                ) {
                  // The distance to the closest intersect is in range
                  inRange.push(intersect);
                } else {
                  // The distance to the closest intersect is out of range
                  outOfRange.push(intersect);
                }
              }
              sorted = inRange.concat(outOfRange);
            }
            return sorted;
          },
        }}
      >
        <ambientLight intensity={1} />
        <ContextBridge>
          <MapViewRenderer
            key={props.mapImage.id}
            activeTool={props.activeTool}
            mapImage={props.mapImage}
            fogImage={props.fogImage}
            tokens={props.tokens}
            controlRef={props.controlRef}
            markedAreas={props.markedAreas}
            removeMarkedArea={props.removeMarkedArea}
            grid={props.grid}
            fogOpacity={props.fogOpacity}
          />
        </ContextBridge>
      </Canvas>
    </MapCanvasContainer>
  );
};

const MapToolRenderer = <
  LocalState extends {} = any,
  ContextState extends {} = any
>(props: {
  tool: MapTool;
  toolRef: React.MutableRefObject<{
    handlers?: any;
  } | null>;
  handlerContext: SharedMapToolState;
}): React.ReactElement => {
  const handlers = React.useRef<any>(null);

  React.useEffect(() => {
    props.toolRef.current = {
      handlers: handlers.current,
    };

    return () => {
      props.toolRef.current = null;
    };
  });

  return (
    <props.tool.Component
      mapContext={props.handlerContext}
      useMapGesture={(config) => {
        props.toolRef.current = {
          handlers: (handlers.current = config),
        };
      }}
    />
  );
};
