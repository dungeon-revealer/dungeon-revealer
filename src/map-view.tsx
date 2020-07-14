import * as React from "react";
import { Canvas, useLoader, useUpdate, useFrame } from "react-three-fiber";
import * as THREE from "three";
import { getOptimalDimensions } from "./util";
import { TextureLoader } from "three";
import { animated, useSpring, SpringValue } from "@react-spring/three";
import { useGesture } from "react-use-gesture";
import { darken, lighten } from "polished";
import { useStaticRef } from "./hooks/use-static-ref";
import { buildUrl } from "./public-url";
import { useUniqueId } from "./hooks/use-unique-id";

type Viewport = { height: number; width: number; factor: number };

const Plane: React.FC = (props) => {
  return (
    <group {...props}>
      <mesh>
        <planeBufferGeometry attach="geometry" args={[10000, 10000]} />
        <meshPhongMaterial attach="material" color="black" />
      </mesh>
      {props.children}
    </group>
  );
};

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

const TokenRenderer: React.FC<{
  x: number;
  y: number;
  color: string;
  radius: number;
  textLabel: string;
  viewport: Viewport;
  dimensions: [number, number];
  factor: number;
  updateTokenPosition: ({ x, y }: { x: number; y: number }) => void;
  mapScale: SpringValue<[number, number, number]>;
  hoveredElementRef: React.MutableRefObject<null | unknown>;
}> = (props) => {
  const initialRadius = useStaticRef(() => props.radius * props.factor);
  const id = useUniqueId();
  const font = useLoader(THREE.FontLoader, buildUrl("/fonts/roboto-bold.json"));

  const [isHover, setIsHover] = React.useState(false);

  const [animatedProps, set] = useSpring(() => ({
    position: [
      calculateX(props.x, props.factor, props.dimensions[0]),
      calculateY(props.y, props.factor, props.dimensions[1]),
      0,
    ],
    circleScale: [1, 1, 1],
  }));

  React.useEffect(() => {
    const newRadius = props.factor * props.radius;
    set({
      position: [
        calculateX(props.x, props.factor, props.dimensions[0]),
        calculateY(props.y, props.factor, props.dimensions[1]),
        0,
      ],
      circleScale: [newRadius / initialRadius, newRadius / initialRadius, 1],
    });
  }, [props.x, props.y, props.radius, props.factor, set, props.dimensions]);

  const isDraggingRef = React.useRef(false);

  const dragProps = useGesture({
    onDrag: ({ movement, last, memo = animatedProps.position.get() }) => {
      isDraggingRef.current = true;

      const mapScale = props.mapScale.get();
      const newX = memo[0] + movement[0] / props.viewport.factor / mapScale[0];
      const newY = memo[1] - movement[1] / props.viewport.factor / mapScale[1];

      set({
        position: [newX, newY, 0],
        immediate: true,
      });

      if (last) {
        props.updateTokenPosition({
          x: calculateRealX(newX, props.factor, props.dimensions[0]),
          y: calculateRealY(newY, props.factor, props.dimensions[1]),
        });
        isDraggingRef.current = false;
      }

      return memo;
    },
    onPointerDown: (event) => {
      setIsHover(true);
      event.stopPropagation();
    },
    onPointerOver: () => {
      setIsHover(true);
      props.hoveredElementRef.current = id;
    },
    onPointerUp: () => {
      // TODO: only on tablet
      setIsHover(false);
      props.hoveredElementRef.current = null;
    },
    onPointerOut: () => {
      if (isDraggingRef.current === false) {
        setIsHover(false);
        props.hoveredElementRef.current = null;
      }
    },
    onClick: () => {
      setIsHover(false);
      props.hoveredElementRef.current = null;
    },
  });

  const meshRef = useUpdate<THREE.Mesh>((self) => {
    const size = new THREE.Vector3();
    self.geometry.computeBoundingBox();
    self.geometry.boundingBox?.getSize(size);
    self.position.x = -size.x / 2;
    self.position.y = -size.y / 2;
  }, []);

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
      <mesh ref={meshRef}>
        <textBufferGeometry
          attach="geometry"
          args={[
            props.textLabel,
            {
              font,
              size: 0.8 * initialRadius,
              height: 0,
            },
          ]}
        />
        <meshBasicMaterial attach="material" color="black" transparent={true} />
      </mesh>
    </animated.group>
  );
};

type Token = {
  id: string;
  radius: number;
  color: string;
  label: string;
  x: number;
  y: number;
  isVisibleForPlayers: boolean;
};

const MapRenderer: React.FC<{
  mapImageUrl: string;
  fogCanvas: HTMLCanvasElement;
  viewport: Viewport;
  tokens: Token[];
  scale: SpringValue<[number, number, number]>;
  updateTokenPosition: (id: string, position: { x: number; y: number }) => void;
  hoveredElementRef: React.MutableRefObject<null | unknown>;
  mapTextureNeedsUpdateRef: React.MutableRefObject<boolean>;
}> = (props) => {
  const mapImage = useLoader(TextureLoader, props.mapImageUrl);

  const fogTexture = React.useMemo(() => new THREE.Texture(props.fogCanvas), [
    props.fogCanvas,
  ]);

  // TODO: find a better way to communicate updates. Maybe pull that stuff into this component?
  useFrame(() => {
    if (props.mapTextureNeedsUpdateRef.current) {
      fogTexture.needsUpdate = true;
      props.mapTextureNeedsUpdateRef.current = false;
    }
  });

  const dimensions = React.useMemo(() => {
    if (!mapImage.image) {
      return null;
    }

    const optimalDimensions = getOptimalDimensions(
      mapImage.image.naturalWidth,
      mapImage.image.naturalHeight,
      props.viewport.width * 0.95,
      props.viewport.height * 0.95
    );

    return [optimalDimensions.width, optimalDimensions.height] as [
      number,
      number
    ];
  }, [mapImage, props.viewport]);

  if (!dimensions) {
    return null;
  }

  const factor = dimensions[0] / mapImage.image.naturalWidth;

  return (
    <>
      <group renderOrder={0}>
        <mesh>
          <planeBufferGeometry attach="geometry" args={dimensions} />
          <meshStandardMaterial attach="material" map={mapImage} />
        </mesh>
        <mesh>
          <planeBufferGeometry attach="geometry" args={dimensions} />
          <meshBasicMaterial
            attach="material"
            map={fogTexture}
            transparent={true}
          />
        </mesh>
      </group>
      {props.tokens
        .filter((token) => token.isVisibleForPlayers)
        .map((token) => (
          <TokenRenderer
            key={token.id}
            x={token.x}
            y={token.y}
            color={token.color}
            textLabel={token.label}
            factor={factor}
            radius={token.radius}
            dimensions={dimensions}
            viewport={props.viewport}
            updateTokenPosition={(position) =>
              props.updateTokenPosition(token.id, position)
            }
            mapScale={props.scale}
            hoveredElementRef={props.hoveredElementRef}
          />
        ))}
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
  touchOrigin: [touchOriginX, touchOriginY],
  currentTranslate: [translateX, translateY],
  aspect,
}: {
  imageTopLeftY: number;
  imageTopLeftX: number;
  imageWidth: number;
  imageHeight: number;
  scale: number;
  pinchDelta: number;
  touchOrigin: [number, number];
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

type ControlInterface = {
  center: () => void;
};

export const MapView: React.FC<{
  mapImageUrl: string;
  fogCanvas: HTMLCanvasElement;
  tokens: Token[];
  controlRef?: React.MutableRefObject<ControlInterface>;
  updateTokenPosition: (id: string, props: { x: number; y: number }) => void;
  mapTextureNeedsUpdateRef: React.MutableRefObject<boolean>;
}> = (props) => {
  const [viewport, setViewport] = React.useState<Viewport | null>(null);
  const hoveredElementRef = React.useRef(null);

  const [spring, set] = useSpring(() => ({
    scale: [1, 1, 1] as [number, number, number],
    position: [0, 0, 0] as [number, number, number],
  }));

  React.useEffect(() => {
    const wheelHandler = (ev: WheelEvent) => {
      ev.preventDefault();
    };
    // without this the pinch-zoom on desktop (chrome osx) is interfered by wheel events
    document.addEventListener("wheel", wheelHandler, { passive: false });

    const gestureStartHandler = (ev: Event) => ev.preventDefault();
    const gestureChangeHandler = (ev: Event) => ev.preventDefault();

    return () => {
      document.removeEventListener("wheel", wheelHandler);
      document.removeEventListener("gesturestart", gestureStartHandler);
      document.removeEventListener("gesturestart", gestureChangeHandler);
    };
  }, []);

  React.useEffect(() => {
    if (props.controlRef) {
      props.controlRef.current = {
        center: () =>
          set({
            scale: [1, 1, 1] as [number, number, number],
            position: [0, 0, 0] as [number, number, number],
            immediate: true,
          }),
      };
    }
  });

  const isDragDisabledRef = React.useRef(false);

  const bind = useGesture(
    {
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
    },
    {}
  );

  useGesture(
    {
      onPinchEnd: () => {
        setTimeout(() => {
          isDragDisabledRef.current = false;
        }, 100);
      },
      onPinch: ({
        movement: [xMovement],
        event,
        origin,
        ctrlKey,
        last,
        cancel,
      }) => {
        if (!viewport || !event) {
          return;
        }
        isDragDisabledRef.current = true;

        const position = spring.position.get();
        const [scale] = spring.scale.get();
        let [touchOriginX, touchOriginY] = origin;

        // Don't calculate new translate offsets on final frame
        if (last) {
          cancel?.();
          return;
        }

        // Speed up pinch zoom when using mouse versus touch
        const SCALE_FACTOR = 100;
        const pinchScale = Math.max(scale + xMovement / SCALE_FACTOR, 0.1);
        const pinchDelta = pinchScale - scale;

        // // @ts-ignore
        // const { clientX, clientY } = event;

        const clientX =
          "clientX" in event ? event.clientX : event?.touches?.[0]?.clientX;
        const clientY =
          "clientX" in event ? event.clientY : event?.touches?.[0]?.clientY;

        if (clientX === undefined || clientY === undefined) {
          return;
        }

        const {
          imageWidth,
          imageHeight,
          imageTopLeftY,
          imageTopLeftX,
        } = calculateScreenPosition({
          imageDimensions: { width: 5, height: 7 },
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
          // Use the [x, y] coords of mouse if a track-pad or ctrl + wheel event
          // Otherwise use touch origin
          touchOrigin: ctrlKey
            ? [clientX, clientY]
            : [touchOriginX, touchOriginY],
        });

        set({
          scale: [pinchScale, pinchScale, 1],
          position: [newTranslateX, newTranslateY, 0],
        });
      },
    },
    {
      domTarget: window.document,
    }
  );
  return (
    <div style={{ height: "100%", touchAction: "manipulation" }}>
      <Canvas
        camera={{ position: [0, 0, 5] }}
        onCreated={(props) => {
          setViewport({
            factor: props.viewport.factor,
            width: props.viewport.width,
            height: props.viewport.height,
          });
        }}
      >
        <ambientLight intensity={1} />
        {viewport ? (
          <React.Fragment>
            <Plane {...bind()}>
              <animated.group position={spring.position} scale={spring.scale}>
                <React.Suspense fallback={null}>
                  <MapRenderer
                    mapImageUrl={props.mapImageUrl}
                    fogCanvas={props.fogCanvas}
                    viewport={viewport}
                    tokens={props.tokens}
                    updateTokenPosition={props.updateTokenPosition}
                    scale={spring.scale}
                    hoveredElementRef={hoveredElementRef}
                    mapTextureNeedsUpdateRef={props.mapTextureNeedsUpdateRef}
                  />
                </React.Suspense>
              </animated.group>
            </Plane>
          </React.Fragment>
        ) : null}
      </Canvas>
    </div>
  );
};
