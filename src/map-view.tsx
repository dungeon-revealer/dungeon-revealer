import * as React from "react";
import { Canvas, useLoader } from "react-three-fiber";
import * as THREE from "three";
import { getOptimalDimensions } from "./util";
import { TextureLoader } from "three";
import { animated, useSpring } from "react-spring/three";
import { useGesture } from "react-use-gesture";

const Plane: React.FC<{}> = ({}) => {
  return (
    <mesh>
      <planeBufferGeometry attach="geometry" args={[10000, 10000]} />
      <meshPhongMaterial attach="material" color="#48BF6C" />
    </mesh>
  );
};

const Texture: React.FC<{ texture: THREE.Texture }> = (props) => {
  const dimensions = React.useMemo(() => {
    if (!props.texture.image) {
      return [1, 1] as [number, number];
    }

    const { naturalWidth, naturalHeight } = props.texture.image;
    const optimalDimensions = getOptimalDimensions(
      naturalWidth,
      naturalHeight,
      10,
      10
    );
    return [optimalDimensions.width, optimalDimensions.height] as [
      number,
      number
    ];
  }, [props.texture.image]);

  return (
    <mesh>
      <planeBufferGeometry attach="geometry" args={dimensions} />
      <meshStandardMaterial attach="material" map={props.texture} />
    </mesh>
  );
};

const MapRenderer: React.FC<{ map: string; fog: string }> = (props) => {
  const mapImage = useLoader(TextureLoader, props.map);
  const fogImage = useLoader(TextureLoader, props.fog);

  const dimensions = React.useMemo(() => {
    if (!mapImage.image || !fogImage.image) {
      return null;
    }

    const optimalDimensions = getOptimalDimensions(
      mapImage.image.naturalWidth,
      mapImage.image.naturalHeight,
      10,
      10
    );

    return [optimalDimensions.width, optimalDimensions.height] as [
      number,
      number
    ];
  }, [mapImage, fogImage]);

  return dimensions ? (
    <>
      <mesh>
        <planeBufferGeometry attach="geometry" args={dimensions} />
        <meshStandardMaterial attach="material" map={mapImage} />
      </mesh>
      <mesh>
        <planeBufferGeometry attach="geometry" args={dimensions} />
        <meshStandardMaterial
          attach="material"
          map={fogImage}
          transparent={true}
        />
      </mesh>
    </>
  ) : null;
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
  //console.log(touchOriginX, touchOriginY);
  // Get the (x,y) touch position relative to image origin at the current scale
  const imageCoordX = (touchOriginX - imageTopLeftX - imageWidth / 2) / scale;
  const imageCoordY = (touchOriginY - imageTopLeftY - imageHeight / 2) / scale;
  // console.log(imageCoordX, imageCoordY);
  // Calculate translateX/Y offset at the next scale to zoom to touch position
  const newTranslateX =
    (-imageCoordX * pinchDelta + translateX * aspect) / aspect;
  const newTranslateY =
    (imageCoordY * pinchDelta + translateY * aspect) / aspect;

  return [newTranslateX, newTranslateY];
};

// without this the pinch-zoom on desktop (chrome osx) is interfered by wheel events
document.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);
document.addEventListener("gesturestart", (e) => e.preventDefault(), false);
document.addEventListener("gesturechange", (e) => e.preventDefault(), false);

export const MapView: React.FC<{
  images: [string, string] | null;
}> = (props) => {
  const aspectRef = React.useRef(1);
  const [spring, set] = useSpring(() => ({
    scale: [1, 1, 1] as [number, number, number],
    position: [0, 0, 0] as [number, number, number],
    immediate: true,
  }));
  const [viewportDimensions, setDimensions] = React.useState(() => ({
    width: 0,
    height: 0,
  }));

  // const isPinchingRef = React.useRef(false);

  useGesture(
    {
      onPinch: ({
        movement: [xMovement],
        event,
        origin,
        ctrlKey,
        last,
        cancel,
      }) => {
        // isPinchingRef.current = true;

        const position = spring.position.get();
        const [scale] = spring.scale.get();
        // Prevent ImagePager from registering isDragging
        // setDisableDrag(true);

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

        // @ts-ignore
        const { clientX, clientY } = event;

        const {
          imageWidth,
          imageHeight,
          imageTopLeftY,
          imageTopLeftX,
        } = calculateScreenPosition({
          imageDimensions: { width: 5, height: 7 },
          viewportDimensions: viewportDimensions,
          scale,
          translateX: position[0],
          translateY: position[1],
          aspect: aspectRef.current,
        });

        // Calculate the amount of x, y translate offset needed to
        // zoom-in to point as image scale grows
        const [newTranslateX, newTranslateY] = getTranslateOffsetsFromScale({
          imageTopLeftY,
          imageTopLeftX,
          imageWidth,
          imageHeight,
          scale,
          aspect: aspectRef.current,
          pinchDelta: pinchDelta,
          currentTranslate: [position[0], position[1]],
          // Use the [x, y] coords of mouse if a trackpad or ctrl + wheel event
          // Otherwise use touch origin
          touchOrigin: ctrlKey
            ? [clientX, clientY]
            : [touchOriginX, touchOriginY],
        });

        set({
          scale: [pinchScale, pinchScale, 1],
          position: [newTranslateX, newTranslateY, 0],
          // pinching: true,
        });
      },
      onTouchEnd: (event) => {
        if (event.touches.length < 2) {
          // isPinchingRef.current = false;
        }
      },
      onDrag: ({
        movement: [xMovement, yMovement],
        first,
        memo = { initialTranslateX: 0, initialTranslateY: 0 },
      }) => {
        // if (isPinchingRef.current) return;
        const [translateX, translateY] = spring.position.get();
        if (first) {
          return {
            initialTranslateX: translateX,
            initialTranslateY: translateY,
          };
        }
        set({
          position: [
            memo.initialTranslateX + xMovement / aspectRef.current,
            memo.initialTranslateY - yMovement / aspectRef.current,
            0,
          ],
        });
        return memo;
      },
    },
    {
      eventOptions: { passive: false },
      // @ts-ignore
      initial: () => spring.position.get(),
      domTarget: window.document,
      window,
    }
  );

  const [mousePos, setMousePos] = React.useState(() => [0, 0]);

  //   React.useEffect(() => {
  //     const listener = (ev) => {
  //       setMousePos([ev.clientX, ev.clientY]);
  //     };
  //     window.addEventListener("mousemove", listener);

  //     const onClick = (ev) => {
  //       const [translateX, translateY] = spring.position.get();
  //       const [scale] = spring.scale.get();

  //       const { imageTopLeftY, imageTopLeftX } = calculateScreenPosition({
  //         imageDimensions: { width: 5, height: 7 },
  //         scale,
  //         translateX,
  //         translateY,
  //         aspect: aspectRef.current,
  //       });

  //       console.log(
  //         "Image position relative to viewport:",
  //         imageTopLeftY,
  //         imageTopLeftX
  //       );
  //     };
  //     window.addEventListener("click", onClick);

  //     return () => {
  //       window.removeEventListener("mousemove", listener);
  //       window.removeEventListener("click", onClick);
  //     };
  //   }, []);

  return (
    <div
      ref={(element) => {
        if (element && viewportDimensions.width === 0) {
          setDimensions({
            width: element.clientWidth,
            height: element.clientHeight,
          });
        }
      }}
      style={{ height: "100%" }}
    >
      <Canvas
        camera={{ position: [0, 0, 5] }}
        onCreated={({ aspect, size, viewport }) => {
          aspectRef.current = viewport.factor;
        }}
      >
        <ambientLight intensity={1} />
        <Plane />
        <animated.group
          position={spring.position as any}
          scale={spring.scale as any}
        >
          {Array.isArray(props.images) ? (
            <React.Suspense fallback={null}>
              <MapRenderer map={props.images[0]} fog={props.images[1]} />
            </React.Suspense>
          ) : null}
        </animated.group>
      </Canvas>
    </div>
  );
};
