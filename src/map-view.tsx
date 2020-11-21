import * as React from "react";
import * as THREE from "three";
import { Canvas, PointerEvent } from "react-three-fiber";
import { getOptimalDimensions } from "./util";
import { animated, useSpring, SpringValue } from "@react-spring/three";
import { useGesture } from "react-use-gesture";
import { darken, lighten } from "polished";
import { useStaticRef } from "./hooks/use-static-ref";
import { buildUrl } from "./public-url";
import { useUniqueId } from "./hooks/use-unique-id";
import { debounce } from "lodash";
import { CanvasText } from "./canvas-text";

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

type Viewport = { height: number; width: number; factor: number };

type Dimensions = { width: number; height: number; ratio: number };

type Token = {
  id: string;
  radius: number;
  color: string;
  label: string;
  x: number;
  y: number;
  isVisibleForPlayers: boolean;
  isMovableByPlayers: boolean;
  isLocked: boolean;
};

type MarkedArea = {
  id: string;
  x: number;
  y: number;
};

type Grid = {
  x: number;
  y: number;
  sideLength: number;
  color: string;
};

const Plane: React.FC<{
  position: SpringValue<[number, number, number]>;
  scale: SpringValue<[number, number, number]>;
}> = (props) => {
  return (
    <animated.group {...props}>
      <mesh>
        <planeBufferGeometry attach="geometry" args={[10000, 10000]} />
        <meshPhongMaterial attach="material" color="black" />
      </mesh>
      {props.children}
    </animated.group>
  );
};

const TokenRenderer: React.FC<{
  x: number;
  y: number;
  color: string;
  radius: number;
  textLabel: string;
  viewport: Viewport;
  dimensions: Dimensions;
  factor: number;
  isLocked: boolean;
  isMovableByPlayers: boolean;
  updateTokenPosition: ({ x, y }: { x: number; y: number }) => void;
  mapScale: SpringValue<[number, number, number]>;
  hoveredElementRef: React.MutableRefObject<null | unknown>;
}> = (props) => {
  const initialRadius = useStaticRef(() => props.radius * props.factor);
  const id = useUniqueId();

  const isLocked = props.isMovableByPlayers === false || props.isLocked;

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

  const isDraggingRef = React.useRef(false);

  const dragProps = useGesture(
    {
      onDrag: ({ movement, last, memo = animatedProps.position.get() }) => {
        isDraggingRef.current = true;

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
          isDraggingRef.current = false;
        }

        return memo;
      },
      onPointerDown: ({ event }) => {
        if (isLocked === false) {
          setIsHover(true);
          event.stopPropagation();
        }
      },
      onPointerOver: () => {
        if (isLocked === false) {
          setIsHover(true);
          props.hoveredElementRef.current = id;
        }
      },
      onPointerUp: () => {
        if (isLocked === false) {
          // TODO: only on tablet
          setIsHover(false);
          props.hoveredElementRef.current = null;
        }
      },
      onPointerOut: () => {
        if (isLocked === false) {
          if (isDraggingRef.current === false) {
            setIsHover(false);
            props.hoveredElementRef.current = null;
          }
        }
      },
      onClick: () => {
        if (isLocked === false) {
          setIsHover(false);
          props.hoveredElementRef.current = null;
        }
      },
    },
    {
      enabled: isLocked === false,
    }
  );

  const color = isHover ? lighten(0.1, props.color) : props.color;

  return (
    <animated.group
      renderOrder={1}
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
          transparent={true}
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
      scale: [10, 10, 10] as [number, number, number],
      opacity: 0,
    },
    config: {
      duration: 1250,
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
        args={[initialRadius * (1 - 0.1), initialRadius, 128]}
      />
      <animated.meshStandardMaterial
        attach="material"
        color={"red"}
        transparent={true}
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

const drawGridToContext = (grid: Grid, canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  context.strokeStyle = grid.color || "rgba(0, 0, 0, .5)";
  context.lineWidth = 2;

  const sideLength = grid.sideLength;
  const offsetX = reduceOffsetToMinimum(grid.x, sideLength);
  const offsetY = reduceOffsetToMinimum(grid.y, sideLength);

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

const GridRenderer: React.FC<{
  grid: Grid;
  dimensions: Dimensions;
  factor: number;
  imageHeight: number;
  imageWidth: number;
}> = (props) => {
  const texture = React.useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = props.imageWidth;
    canvas.height = props.imageHeight;
    drawGridToContext(props.grid, canvas);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <mesh>
      <planeBufferGeometry
        attach="geometry"
        args={[props.dimensions.width, props.dimensions.height]}
      />
      <meshStandardMaterial
        attach="material"
        map={texture}
        transparent={true}
      />
    </mesh>
  );
};

const MapRenderer: React.FC<{
  mapImage: HTMLImageElement;
  mapImageTexture: THREE.Texture;
  fogTexture: THREE.Texture;
  viewport: Viewport;
  tokens: Token[];
  markedAreas: MarkedArea[];
  removeMarkedArea: (id: string) => void;
  grid: Grid | null;
  scale: SpringValue<[number, number, number]>;
  updateTokenPosition: (id: string, position: { x: number; y: number }) => void;
  hoveredElementRef: React.MutableRefObject<null | unknown>;
  factor: number;
  dimensions: Dimensions;
}> = (props) => {
  return (
    <>
      <group renderOrder={0}>
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
          />
        </mesh>
      </group>
      <group>
        {props.tokens
          .filter((token) => token.isVisibleForPlayers)
          .map((token) => (
            <TokenRenderer
              key={token.id}
              x={token.x}
              y={token.y}
              color={token.color}
              textLabel={token.label}
              isLocked={token.isLocked}
              isMovableByPlayers={token.isMovableByPlayers}
              factor={props.factor}
              radius={token.radius}
              dimensions={props.dimensions}
              viewport={props.viewport}
              updateTokenPosition={(position) =>
                props.updateTokenPosition(token.id, position)
              }
              mapScale={props.scale}
              hoveredElementRef={props.hoveredElementRef}
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

const calculateScreenPosition = ({
  imageDimensions: { width, height },
  viewportDimensions,
  scale,
  translateX,
  translateY,
  aspect,
}: {
  imageDimensions: { width: number; height: number };
  viewportDimensions: { width: number; height: number };
  scale: number;
  translateX: number;
  translateY: number;
  aspect: number;
}) => {
  const imageWidth = width * scale * aspect;
  const imageHeight = height * scale * aspect;
  const imageTopLeftX =
    translateX * aspect + viewportDimensions.width / 2 - imageWidth / 2;
  const imageTopLeftY =
    viewportDimensions.height / 2 - translateY * aspect - imageHeight / 2;
  return { imageWidth, imageHeight, imageTopLeftY, imageTopLeftX };
};

const getTranslateOffsetsFromScale = ({
  imageTopLeftY,
  imageTopLeftX,
  imageWidth,
  imageHeight,
  scale,
  pinchDelta,
  origin: [touchOriginX, touchOriginY],
  currentTranslate: [translateX, translateY],
  aspect,
}: {
  imageTopLeftY: number;
  imageTopLeftX: number;
  imageWidth: number;
  imageHeight: number;
  scale: number;
  pinchDelta: number;
  origin: [number, number];
  currentTranslate: [number, number];
  aspect: number;
}) => {
  // Get the (x,y) touch position relative to image origin at the current scale
  const imageCoordX = (touchOriginX - imageTopLeftX - imageWidth / 2) / scale;
  const imageCoordY = (touchOriginY - imageTopLeftY - imageHeight / 2) / scale;
  // Calculate translateX/Y offset at the next scale to zoom to touch position
  const newTranslateX =
    (-imageCoordX * pinchDelta + translateX * aspect) / aspect;
  const newTranslateY =
    (imageCoordY * pinchDelta + translateY * aspect) / aspect;

  return [newTranslateX, newTranslateY];
};

export type MapControlInterface = {
  center: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

export const MapView: React.FC<{
  mapImage: HTMLImageElement;
  fogImage: HTMLImageElement | null;
  tokens: Token[];
  controlRef?: React.MutableRefObject<MapControlInterface | null>;
  updateTokenPosition: (id: string, props: { x: number; y: number }) => void;
  markedAreas: MarkedArea[];
  markArea: (coordinates: { x: number; y: number }) => void;
  removeMarkedArea: (id: string) => void;
  grid: Grid | null;
}> = (props) => {
  const [viewport, setViewport] = React.useState<Viewport | null>(null);
  const hoveredElementRef = React.useRef(null);

  const [spring, set] = useSpring(() => ({
    scale: [1, 1, 1] as [number, number, number],
    position: [0, 0, 0] as [number, number, number],
  }));

  const [mapCanvas] = React.useState(() =>
    window.document.createElement("canvas")
  );
  const [fogCanvas] = React.useState(() =>
    window.document.createElement("canvas")
  );

  const [mapTexture, setMapTexture] = React.useState(
    () => new THREE.Texture(mapCanvas)
  );
  const [fogTexture, setFogTexture] = React.useState(
    () => new THREE.Texture(fogCanvas)
  );
  const [maximumTextureSize, setMaximumTextureSize] = React.useState<
    number | null
  >(null);
  console.log(maximumTextureSize);

  React.useEffect(() => {
    set({
      scale: [1, 1, 1],
      position: [0, 0, 0],
    });
  }, [mapTexture, set]);

  React.useEffect(() => {
    if (!maximumTextureSize) {
      return;
    }
    if (props.fogImage) {
      const { width, height } = getOptimalDimensions(
        props.fogImage.naturalWidth,
        props.fogImage.naturalHeight,
        maximumTextureSize,
        maximumTextureSize
      );
      fogCanvas.width = width;
      fogCanvas.height = height;
      const context = fogCanvas.getContext("2d");
      if (!context) {
        return;
      }
      context.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
      context.drawImage(
        props.fogImage,
        0,
        0,
        fogCanvas.width,
        fogCanvas.height
      );
      fogTexture.dispose();
      const newTexture = new THREE.Texture(fogCanvas);
      newTexture.needsUpdate = true;
      setFogTexture(newTexture);
    } else {
      const context = fogCanvas.getContext("2d");
      if (!context) {
        alert("NO");
        return;
      }
      context.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
      fogTexture.needsUpdate = true;
    }
  }, [props.fogImage, fogCanvas, maximumTextureSize]);

  React.useEffect(() => {
    if (!maximumTextureSize) {
      return;
    }
    const { width, height } = getOptimalDimensions(
      props.mapImage.naturalWidth,
      props.mapImage.naturalHeight,
      maximumTextureSize,
      maximumTextureSize
    );

    mapCanvas.width = width;
    mapCanvas.height = height;
    const context = mapCanvas.getContext("2d");
    if (!context) {
      alert("NO");
      return;
    }
    context.drawImage(props.mapImage, 0, 0, mapCanvas.width, mapCanvas.height);
    mapTexture.dispose();
    const newTexture = new THREE.Texture(mapCanvas);
    newTexture.needsUpdate = true;
    setMapTexture(newTexture);
  }, [props.mapImage, mapCanvas, maximumTextureSize]);

  const dimensions = React.useMemo(() => {
    if (viewport) {
      const optimalDimensions = getOptimalDimensions(
        props.mapImage.naturalWidth,
        props.mapImage.naturalHeight,
        viewport.width * 0.95,
        viewport.height * 0.95
      );

      return optimalDimensions;
    }

    return null;
  }, [props.mapImage, viewport, maximumTextureSize]);

  React.useEffect(() => {
    if (props.controlRef) {
      props.controlRef.current = {
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
      };
    }
  });

  const isDragDisabledRef = React.useRef(false);
  const pointerTimer = React.useRef<NodeJS.Timeout>();

  const bind = useGesture<{ onPointerDown: PointerEvent }>(
    {
      onPointerDown: ({ event }) => {
        if (pointerTimer.current) {
          clearTimeout(pointerTimer.current);
        }

        pointerTimer.current = setTimeout(() => {
          if (dimensions) {
            const factor = dimensions.width / props.mapImage.naturalWidth;
            const x = calculateRealX(
              // We need to convert the point to the point local to our element.
              (event.point.x - spring.position.get()[0]) /
                spring.scale.get()[0],
              factor,
              dimensions.width
            );
            const y = calculateRealY(
              // We need to convert the point to the point local to our element.
              (event.point.y - spring.position.get()[1]) /
                spring.scale.get()[1],
              factor,
              dimensions.height
            );
            props.markArea({ x, y });
          }
        }, 200);
      },
      onPointerUp: () => {
        if (pointerTimer.current) {
          clearTimeout(pointerTimer.current);
        }
      },
      onPointerMove: () => {
        if (pointerTimer.current) {
          clearTimeout(pointerTimer.current);
        }
      },
      onDrag: ({
        movement: [xMovement, yMovement],
        memo = spring.position.get(),
        cancel,
      }) => {
        if (
          !viewport ||
          isDragDisabledRef.current === true ||
          hoveredElementRef.current !== null
        ) {
          cancel();
          return;
        }
        set({
          position: [
            memo[0] + xMovement / viewport.factor,
            memo[1] - yMovement / viewport.factor,
            0,
          ],
          immediate: true,
        });
        return memo;
      },
      onMouseDown: ({ event }) => {
        if (event.target instanceof HTMLCanvasElement) {
          window.document.body.classList.add("user-select-disabled");
          const onUnmount = () => {
            window.document.body.classList.remove("user-select-disabled");
            window.removeEventListener("mouseup", onUnmount);
          };
          window.addEventListener("mouseup", onUnmount);
          onUnmountRef.current = onUnmount;
        }
      },
    },
    {}
  );

  const updateZoom = ({
    pinchDelta,
    pinchScale,
    origin,
  }: {
    pinchDelta: number;
    pinchScale: number;
    origin: [number, number];
  }) => {
    if (!viewport || !dimensions) {
      return;
    }

    const position = spring.position.get();
    const [scale] = spring.scale.get();

    const {
      imageWidth,
      imageHeight,
      imageTopLeftY,
      imageTopLeftX,
    } = calculateScreenPosition({
      imageDimensions: dimensions,
      viewportDimensions: {
        width: viewport.width * viewport.factor,
        height: viewport.height * viewport.factor,
      },
      scale,
      translateX: position[0],
      translateY: position[1],
      aspect: viewport.factor,
    });

    // Calculate the amount of x, y translate offset needed to
    // zoom-in to point as image scale grows
    const [newTranslateX, newTranslateY] = getTranslateOffsetsFromScale({
      imageTopLeftY,
      imageTopLeftX,
      imageWidth,
      imageHeight,
      scale,
      aspect: viewport.factor,
      pinchDelta: pinchDelta,
      currentTranslate: [position[0], position[1]],
      origin,
    });

    set({
      scale: [pinchScale, pinchScale, 1],
      position: [newTranslateX, newTranslateY, 0],
    });
  };

  useGesture(
    {
      onPinchEnd: () => {
        setTimeout(() => {
          isDragDisabledRef.current = false;
        }, 100);
      },
      onWheel: ({ event }) => {
        if (event.target instanceof HTMLCanvasElement === false) {
          return;
        }
        event.preventDefault();

        const [scale] = spring.scale.get();
        const origin = [event.clientX, event.clientY] as [number, number];

        const wheel = event.deltaY < 0 ? 1 : -1;
        const pinchScale = Math.max(0.1, Math.exp(wheel * 0.5) * scale);
        const pinchDelta = pinchScale - scale;

        updateZoom({ pinchDelta, pinchScale, origin });
      },
      onPinch: ({ movement, event, origin, last, cancel }) => {
        if (event.target instanceof HTMLCanvasElement === false) {
          return;
        }
        event.preventDefault();
        isDragDisabledRef.current = true;

        const [scale] = spring.scale.get();

        // Don't calculate new translate offsets on final frame
        if (last) {
          cancel?.();
          return;
        }

        let xMovement = Array.isArray(movement) ? movement[0] : 0;

        const wheel = xMovement > 0 ? 1 : -1;
        const pinchScale = Math.max(0.1, Math.exp(wheel * 0.5) * scale);
        const pinchDelta = pinchScale - scale;

        updateZoom({ pinchDelta, pinchScale, origin });
      },
    },
    {
      domTarget: window.document,
      eventOptions: {
        passive: false,
      },
    }
  );

  const onUnmountRef = React.useRef<() => void>();
  React.useEffect(() => () => onUnmountRef.current?.(), []);

  return (
    <div style={{ height: "100%", touchAction: "manipulation" }}>
      <Canvas
        camera={{ position: [0, 0, 5] }}
        onCreated={(props) => {
          const syncViewport = () =>
            setViewport({
              factor: props.viewport.factor,
              width: props.viewport.width,
              height: props.viewport.height,
            });

          const listener = debounce(syncViewport, 500);

          window.addEventListener("resize", listener);
          onUnmountRef.current = () =>
            window.removeEventListener("resize", listener);
          syncViewport();
          setMaximumTextureSize(props.gl.capabilities.maxTextureSize);
        }}
        // we wanna have the best quality available on retina displays
        // https://discourse.threejs.org/t/render-looks-blurry-and-pixelated-even-with-antialias-true-why/12381
        pixelRatio={window.devicePixelRatio}
      >
        <React.Suspense fallback={null}>
          <ambientLight intensity={1} />
          {dimensions && viewport ? (
            <Plane position={spring.position} scale={spring.scale} {...bind()}>
              <MapRenderer
                mapImage={props.mapImage}
                mapImageTexture={mapTexture}
                fogTexture={fogTexture}
                viewport={viewport}
                tokens={props.tokens}
                markedAreas={props.markedAreas}
                removeMarkedArea={props.removeMarkedArea}
                grid={props.grid}
                updateTokenPosition={props.updateTokenPosition}
                scale={spring.scale}
                hoveredElementRef={hoveredElementRef}
                dimensions={dimensions}
                factor={dimensions.width / props.mapImage.width}
              />
            </Plane>
          ) : null}
        </React.Suspense>
      </Canvas>
    </div>
  );
};
