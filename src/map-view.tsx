import * as React from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import {
  Canvas,
  PointerEvent,
  useLoader,
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
import { useNoteWindowActions } from "./dm-area/token-info-aside";
import { TextureLoader, Vector2 } from "three";
import { ReactEventHandlers } from "react-use-gesture/dist/types";

type Vector2D = [number, number];

enum LayerRenderOrder {
  map = 0,
  mapGrid = 1,
  token = 2,
  tokenGesture = 3,
  marker = 4,
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
    return (
      <animated.group position={position} scale={scale}>
        <mesh ref={ref} {...props}>
          <planeBufferGeometry attach="geometry" args={[10000, 10000]} />
          <meshBasicMaterial attach="material" color="black" />
        </mesh>
        {children}
      </animated.group>
    );
  }
);

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
  reference: null | { type: "note"; id: string };
  attachment: File | undefined;
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
      0,
    ] as [number, number, number],
    circleScale: [1, 1, 1] as [number, number, number],
  }));

  React.useEffect(() => {
    const newRadius = props.factor * props.radius;
    set({
      position: [
        calculateX(props.x, props.factor, props.dimensions.width),
        calculateY(props.y, props.factor, props.dimensions.height),
        0,
      ],
      circleScale: [newRadius / initialRadius, newRadius / initialRadius, 1],
    });
  }, [props.x, props.y, props.radius, props.factor, set, props.dimensions]);

  React.useEffect(() => {
    if (isLocked === false) {
      setIsHover(false);
    }
  }, [isLocked]);

  const noteWindowActions = useNoteWindowActions();

  const openContextMenu = (x: number, y: number) =>
    tokenMenuContext?.setState({
      type: "selected",
      tokenId: props.id,
      position: new SpringValue({
        from: [x, y] as [number, number],
      }),
    });

  const onPointerDown = React.useRef<null | (() => void)>(null);

  const hoverCounter = React.useRef(0);

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
        last,
        memo = animatedProps.position.get(),
        tap,
      }) => {
        // onClick replacement
        // events are handeled different in react-three-fiber
        // @dbismut advised me that checking for tap in onDrag
        // is the best solution when having both drag and click behaviour.
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
            // right mouse
            if (event.button === 2) {
              setTimeout(() => {
                openContextMenu(event.clientX, event.clientY);
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

        const mapScale = props.mapScale.get();
        const newX =
          memo[0] + movement[0] / props.viewport.factor / mapScale[0];
        const newY =
          memo[1] - movement[1] / props.viewport.factor / mapScale[1];

        set({
          position: [newX, newY, 0],
          immediate: true,
        });

        if (last) {
          props.updateTokenPosition({
            x: calculateRealX(newX, props.factor, props.dimensions.width),
            y: calculateRealY(newY, props.factor, props.dimensions.height),
          });
        }

        return memo;
      },
      onPointerDown: ({ event }) => {
        // Context menu on tablet is opened via a long-press
        const { clientX, clientY } = event;
        const timeout = setTimeout(() => {
          onPointerDown.current = null;
          openContextMenu(clientX, clientY);
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
        onPointerDown.current?.();

        if (isMovable === false) {
          return;
        }
      },
      onPointerOut: () => {
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

  const color = isHover && isMovable ? lighten(0.1, props.color) : props.color;
  return (
    <animated.group
      position={animatedProps.position}
      scale={animatedProps.circleScale}
      renderOrder={LayerRenderOrder.token}
    >
      {props.attachment ? null : (
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
              transparent={true}
            />
          </mesh>
        </>
      )}
      <CanvasText
        fontSize={0.8 * initialRadius}
        color="black"
        font={buildUrl("/fonts/Roboto-Bold.ttf")}
        anchorX="center"
        anchorY="middle"
      >
        {props.textLabel}
      </CanvasText>

      {props.attachment ? (
        <TokenAttachment
          file={props.attachment}
          initialRadius={initialRadius}
          dragProps={dragProps}
          isHover={isHover}
          opacity={props.isVisibleForPlayers ? 1 : 0.5}
        />
      ) : null}
      {props.attachment ? null : (
        <mesh {...dragProps()} renderOrder={LayerRenderOrder.tokenGesture}>
          {/* This one is for attaching the gesture handlers */}
          <circleBufferGeometry attach="geometry" args={[initialRadius, 128]} />
          <meshStandardMaterial
            attach="material"
            color={color}
            opacity={0}
            transparent={true}
          />
        </mesh>
      )}
    </animated.group>
  );
};

const TokenAttachment = (props: {
  file: File;
  initialRadius: number;
  isHover: boolean;
  opacity: number;
  dragProps: () => ReactEventHandlers;
}) => {
  const [url] = React.useState(() => URL.createObjectURL(props.file));
  React.useEffect(
    () => () => {
      URL.revokeObjectURL(url);
    },
    [url]
  );

  return (
    <React.Suspense fallback={null}>
      {props.file.type.includes("svg") ? (
        <SVGELement
          url={url}
          dragProps={props.dragProps}
          isHover={props.isHover}
          opacity={props.opacity}
          initialRadius={props.initialRadius}
        />
      ) : (
        <TextureElement
          url={url}
          dragProps={props.dragProps}
          initialRadius={props.initialRadius}
          isHover={props.isHover}
          opacity={props.opacity}
        />
      )}
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

const SVGELement = (props: {
  url: string;
  dragProps: () => ReactEventHandlers;
  isHover: boolean;
  opacity: number;
  initialRadius: number;
}) => {
  const data = useLoader(SVGLoader, props.url);

  let i = 0;
  const items: Array<React.ReactElement> = [];

  const width = ((data.xml as any) as SVGSVGElement).viewBox.baseVal.width;
  const height = ((data.xml as any) as SVGSVGElement).viewBox.baseVal.height;

  for (const path of data.paths) {
    for (const shape of path.toShapes(true)) {
      i++;
      items.push(
        <mesh
          key={i}
          renderOrder={LayerRenderOrder.token}
          {...props.dragProps()}
        >
          <shapeBufferGeometry args={[shape]} />
          <meshBasicMaterial
            color={
              props.isHover
                ? lighten(0.1, "#" + path.color.getHexString())
                : path.color
            }
            side={THREE.DoubleSide}
            transparent={true}
          />
        </mesh>
      );
    }
  }

  const scale = (props.initialRadius * 2) / width;

  return (
    <group
      scale={[scale, -scale, scale]}
      position={[(-width / 2) * scale, (height / 2) * scale, 0]}
    >
      {items}
    </group>
  );
};

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
  updateTokenPosition: (id: string, position: { x: number; y: number }) => void;
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
            factor={props.factor}
            radius={token.radius}
            dimensions={props.dimensions}
            viewport={props.viewport}
            updateTokenPosition={(position) =>
              props.updateTokenPosition(token.id, position)
            }
            mapScale={props.scale}
            reference={token.reference}
            attachment={token.attachment}
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
          x: token.x * optimalDimensions.ratio,
          y: token.y * optimalDimensions.ratio,
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
