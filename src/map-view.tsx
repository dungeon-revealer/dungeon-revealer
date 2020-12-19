import * as React from "react";
import * as THREE from "three";
import {
  Canvas,
  PointerEvent,
  useThree,
  ViewportData,
} from "react-three-fiber";
import { animated, useSpring, SpringValue } from "@react-spring/three";
import { useGesture } from "react-use-gesture";
import styled from "@emotion/styled/macro";
import { darken, lighten } from "polished";
import { getOptimalDimensions } from "./util";
import { useStaticRef } from "./hooks/use-static-ref";
import { buildUrl } from "./public-url";
import { CanvasText } from "./canvas-text";
import type {
  MapTool,
  MapToolMapGestureHandlers,
  SharedMapToolState,
} from "./map-tools/map-tool";
import { useContextBridge } from "./hooks/use-context-bridge";
import { MapGridEntity, MapTokenEntity, MarkedAreaEntity } from "./map-typings";
import { useIsKeyPressed } from "./hooks/use-is-key-pressed";
import { TokenContextMenuContext } from "./token-context-menu-context";

enum LayerPosition {
  map = 0,
  token = 0.00001,
  marker = 0.00002,
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

const Plane: React.FC<{
  position: SpringValue<[number, number, number]>;
  scale: SpringValue<[number, number, number]>;
}> = ({ children, position, scale, ...props }) => {
  return (
    <animated.group position={position} scale={scale}>
      <mesh {...props}>
        <planeBufferGeometry attach="geometry" args={[10000, 10000]} />
        <meshBasicMaterial attach="material" color="black" />
      </mesh>
      {children}
    </animated.group>
  );
};

const TokenRenderer: React.FC<{
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  textLabel: string;
  viewport: ViewportData;
  dimensions: Dimensions;
  factor: number;
  isLocked: boolean;
  isMovableByPlayers: boolean;
  isVisibleForPlayers: boolean;
  updateTokenPosition: ({ x, y }: { x: number; y: number }) => void;
  mapScale: SpringValue<[number, number, number]>;
}> = (props) => {
  const tokenMenuContext = React.useContext(TokenContextMenuContext);
  const isDungeonMasterView = tokenMenuContext !== null;

  const initialRadius = useStaticRef(
    () => Math.max(1, props.radius) * props.factor
  );

  const isMovable =
    (isDungeonMasterView === true || props.isMovableByPlayers === true) &&
    props.isLocked === false;
  const isLocked = props.isLocked;

  const [isHover, setIsHover] = React.useState(false);

  const [animatedProps, set] = useSpring(() => ({
    position: [
      calculateX(props.x, props.factor, props.dimensions.width),
      calculateY(props.y, props.factor, props.dimensions.height),
      LayerPosition.token,
    ] as [number, number, number],
    circleScale: [1, 1, 1] as [number, number, number],
  }));

  React.useEffect(() => {
    const newRadius = props.factor * props.radius;
    set({
      position: [
        calculateX(props.x, props.factor, props.dimensions.width),
        calculateY(props.y, props.factor, props.dimensions.height),
        LayerPosition.token,
      ],
      circleScale: [newRadius / initialRadius, newRadius / initialRadius, 1],
    });
  }, [props.x, props.y, props.radius, props.factor, set, props.dimensions]);

  React.useEffect(() => {
    if (isLocked === false) {
      setIsHover(false);
    }
  }, [isLocked]);

  const isDraggingRef = React.useRef(false);

  const dragProps = useGesture<{
    onClick: PointerEvent;
    onContextMenu: PointerEvent;
  }>(
    {
      onDrag: ({
        event,
        movement,
        last,
        memo = animatedProps.position.get(),
      }) => {
        if (isMovable === false) {
          return;
        }
        event.stopPropagation();

        const mapScale = props.mapScale.get();
        const newX =
          memo[0] + movement[0] / props.viewport.factor / mapScale[0];
        const newY =
          memo[1] - movement[1] / props.viewport.factor / mapScale[1];

        set({
          position: [newX, newY, LayerPosition.token],
          immediate: true,
        });

        if (last) {
          props.updateTokenPosition({
            x: calculateRealX(newX, props.factor, props.dimensions.width),
            y: calculateRealY(newY, props.factor, props.dimensions.height),
          });
          // isDraggingRef.current = false;
        }

        return memo;
      },
      onPointerDown: ({ event }) => {
        if (isMovable === false) {
          return;
        }
        if (isLocked === false) {
          event.stopPropagation();
          setIsHover(true);
        }
      },
      onPointerOver: () => {
        if (isMovable === false) {
          return;
        }
        if (isLocked === false) {
          setIsHover(true);
        }
      },
      onPointerUp: () => {
        if (isMovable === false) {
          return;
        }
        if (isLocked === false) {
          // TODO: only on tablet
          setIsHover(false);
        }
      },
      onPointerOut: () => {
        if (isMovable === false) {
          return;
        }
        if (isLocked === false) {
          if (isDraggingRef.current === false) {
            setIsHover(false);
          }
        }
      },
      onClick: () => {
        if (isLocked === false) {
          // TODO: only on tablet
          setIsHover(false);
        }
      },
      onContextMenu: (args) => {
        args.event.stopPropagation();
        args.event.nativeEvent.preventDefault();

        tokenMenuContext?.setState({
          type: "selected",
          tokenId: props.id,
          position: new SpringValue({
            from: [args.event.clientX, args.event.clientY] as [number, number],
          }),
        });
      },
    },
    {
      enabled: isLocked === false,
    }
  );

  const color = isHover && isMovable ? lighten(0.1, props.color) : props.color;

  return (
    <animated.group
      position={animatedProps.position}
      scale={animatedProps.circleScale}
      {...dragProps()}
    >
      <mesh>
        <circleBufferGeometry attach="geometry" args={[initialRadius, 128]} />
        <meshStandardMaterial
          attach="material"
          color={color}
          transparent={true}
          opacity={props.isVisibleForPlayers ? 1 : 0.5}
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
          opacity={props.isVisibleForPlayers ? 1 : 0.5}
        />
      </mesh>
      <CanvasText
        fontSize={0.8 * initialRadius}
        color="black"
        font={buildUrl("/fonts/Roboto-Bold.ttf")}
        anchorX="center"
        anchorY="middle"
      >
        {props.textLabel}
      </CanvasText>
    </animated.group>
  );
};

const MarkedAreaRenderer: React.FC<{
  x: number;
  y: number;
  factor: number;
  dimensions: Dimensions;
  remove: () => void;
}> = (props) => {
  const initialRadius = 10 * props.factor;

  const spring = useSpring({
    from: {
      scale: [1, 1, 1] as [number, number, number],
      opacity: 1,
    },
    to: {
      scale: [30, 30, 30] as [number, number, number],
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
        LayerPosition.marker,
      ]}
    >
      <ringBufferGeometry
        attach="geometry"
        args={[initialRadius * (1 - 0.1), initialRadius, 128]}
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
  const sideLength = grid.columnWidth * ratio;
  const offsetX = reduceOffsetToMinimum(gridX, sideLength);
  const offsetY = reduceOffsetToMinimum(gridY, sideLength);

  for (let i = 0; i < canvas.width / sideLength; i++) {
    context.beginPath();
    context.moveTo(offsetX + i * sideLength, 0);
    context.lineTo(offsetX + i * sideLength, canvas.height);
    context.stroke();
  }
  for (let i = 0; i < canvas.height / sideLength; i++) {
    context.beginPath();
    context.moveTo(0, offsetY + i * sideLength);
    context.lineTo(canvas.width, offsetY + i * sideLength);
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
    <mesh>
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
  updateTokenPosition: (id: string, position: { x: number; y: number }) => void;
  factor: number;
  dimensions: Dimensions;
  fogOpacity: number;
}> = (props) => {
  return (
    <>
      <group>
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
      <group>
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
            factor={props.factor}
            radius={token.radius}
            dimensions={props.dimensions}
            viewport={props.viewport}
            updateTokenPosition={(position) =>
              props.updateTokenPosition(token.id, position)
            }
            mapScale={props.scale}
          />
        ))}
      </group>
      <group>
        {props.markedAreas.map((markedArea) => (
          <MarkedAreaRenderer
            key={markedArea.id}
            x={markedArea.x}
            y={markedArea.y}
            factor={props.factor}
            dimensions={props.dimensions}
            remove={() => props.removeMarkedArea(markedArea.id)}
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
  getContext: () => {
    mapCanvas: HTMLCanvasElement;
    fogCanvas: HTMLCanvasElement;
    fogTexture: THREE.CanvasTexture;
  };
};

const MapViewRenderer = (props: {
  mapImage: HTMLImageElement;
  fogImage: HTMLImageElement | null;
  tokens: MapTokenEntity[];
  controlRef?: React.MutableRefObject<MapControlInterface | null>;
  updateTokenPosition: (id: string, props: { x: number; y: number }) => void;
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
        getContext: () => ({
          mapCanvas,
          fogCanvas,
          fogTexture,
        }),
      };
    }
  });

  const isDragAllowed = React.useRef(true);

  const [pointerPosition] = React.useState(
    () => new SpringValue({ from: [0, 0, 0] as [number, number, number] })
  );

  const isAltPressed = useIsKeyPressed("Alt");

  const toolContext = React.useMemo<SharedMapToolState>(() => {
    const factor = dimensions.width / mapCanvas.width;

    return {
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
        vector: {
          threeToCanvas: ([x, y]) => [x / factor, y / factor],
          canvasToThree: ([x, y]) => [x * factor, y * factor],
          canvasToImage: ([x, y]) => [
            x / optimalDimensions.ratio,
            y / optimalDimensions.ratio,
          ],
          imageToCanvas: ([x, y]) => [
            x * optimalDimensions.ratio,
            y * optimalDimensions.ratio,
          ],
        },
        coordinates: {
          threeToCanvas: ([x, y]: [number, number]) =>
            [
              calculateRealX(x, factor, dimensions.width),
              calculateRealY(y, factor, dimensions.height),
            ] as [number, number],
          canvasToThree: ([x, y]: [number, number]) =>
            [
              calculateX(x, factor, dimensions.width),
              calculateY(y, factor, dimensions.height),
            ] as [number, number],
          canvasToImage: ([x, y]: [number, number]) =>
            [x / optimalDimensions.ratio, y / optimalDimensions.ratio] as [
              number,
              number
            ],
          imageToCanvas: ([x, y]) => [
            x * optimalDimensions.ratio,
            y * optimalDimensions.ratio,
          ],
        },
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
  ]);

  const toolRef = React.useRef<{
    contextState: any;
    localState: any;
    handlers?: MapToolMapGestureHandlers;
  } | null>(null);

  const bind = useGesture<{
    onPointerUp: PointerEvent;
    onPointerDown: PointerEvent;
    onPointerMove: PointerEvent;
    onClick: PointerEvent;
    onKeyDown: KeyboardEvent;
  }>({
    onPointerDown: (args) => toolRef.current?.handlers?.onPointerDown?.(args),
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
    <Plane position={spring.position} scale={spring.scale} {...bind()}>
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
          x: token.x * optimalDimensions.ratio,
          y: token.y * optimalDimensions.ratio,
          radius: token.radius * optimalDimensions.ratio,
        }))}
        markedAreas={props.markedAreas.map((area) => ({
          ...area,
          x: area.x * optimalDimensions.ratio,
          y: area.y * optimalDimensions.ratio,
        }))}
        removeMarkedArea={props.removeMarkedArea}
        grid={props.grid}
        updateTokenPosition={(id, coords) =>
          props.updateTokenPosition(id, {
            x: coords.x / optimalDimensions.ratio,
            y: coords.y / optimalDimensions.ratio,
          })
        }
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
  updateTokenPosition: (id: string, props: { x: number; y: number }) => void;
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
            updateTokenPosition={props.updateTokenPosition}
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
