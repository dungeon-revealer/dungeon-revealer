import * as React from "react";
import { useGesture } from "react-use-gesture";
import type { MapTool, SharedMapToolState } from "./map-tool";

export const usePinchWheelZoom = (mapToolState: SharedMapToolState) => {
  const updateZoom = ({
    pinchDelta,
    pinchScale,
    origin,
  }: {
    pinchDelta: number;
    pinchScale: number;
    origin: [number, number];
  }) => {
    const position = mapToolState.mapState.position.get();
    const [scale] = mapToolState.mapState.scale.get();

    const { imageWidth, imageHeight, imageTopLeftY, imageTopLeftX } =
      calculateScreenPosition({
        imageDimensions: mapToolState.dimensions,
        viewportDimensions: {
          width: mapToolState.viewport.width * mapToolState.viewport.factor,
          height: mapToolState.viewport.height * mapToolState.viewport.factor,
        },
        scale,
        translateX: position[0],
        translateY: position[1],
        aspect: mapToolState.viewport.factor,
      });

    // Calculate the amount of x, y translate offset needed to
    // zoom-in to point as image scale grows
    const [newTranslateX, newTranslateY] = getTranslateOffsetsFromScale({
      imageTopLeftY,
      imageTopLeftX,
      imageWidth,
      imageHeight,
      scale,
      aspect: mapToolState.viewport.factor,
      pinchDelta: pinchDelta,
      currentTranslate: [position[0], position[1]],
      origin,
    });

    mapToolState.setMapState({
      scale: [pinchScale, pinchScale, 1],
      position: [newTranslateX, newTranslateY, 0],
    });
  };

  const onUnmountRef = React.useRef<() => void>();
  React.useEffect(() => () => onUnmountRef.current?.(), []);
  useGesture(
    {
      onWheel: ({ event }) => {
        if (event.target instanceof HTMLCanvasElement === false) {
          return;
        }
        event.preventDefault();
        const [scale] = mapToolState.mapState.scale.get();
        const origin = [event.clientX, event.clientY] as [number, number];
        const wheel = event.deltaY < 0 ? 1 : event.deltaY > 0 ? -1 : 0;
        const pinchScale = Math.max(0.1, Math.exp(wheel * 0.3) * scale);
        const pinchDelta = pinchScale - scale;

        updateZoom({ pinchDelta, pinchScale, origin });
      },
      onPinch: ({ movement, event, origin, last, cancel }) => {
        if (event.target instanceof HTMLCanvasElement === false) {
          return;
        }
        event.preventDefault();
        mapToolState.isDragAllowed.current = false;

        const [scale] = mapToolState.mapState.scale.get();

        // Don't calculate new translate offsets on final frame
        if (last) {
          cancel?.();
          return;
        }

        let xMovement = Array.isArray(movement) ? movement[0] : 0;
        const wheel = xMovement > 0 ? 1 : xMovement < 0 ? -1 : 0;
        const pinchScale = Math.max(0.1, Math.exp(wheel * 0.3) * scale);
        const pinchDelta = pinchScale - scale;

        updateZoom({ pinchDelta, pinchScale, origin });
      },
      onPinchEnd: ({ event }) => {
        // This is some kind of a hack to prevent drag being triggerd after ending a pinch gesture
        // which causes the map to jump on tablets such as the iPad.
        event.stopPropagation();
        setTimeout(() => {
          mapToolState.isDragAllowed.current = true;
        }, 100);
      },
      onPointerDown: ({ event }) => {
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
    {
      domTarget: window.document,
      eventOptions: {
        passive: false,
      },
    }
  );
};

export const DragPanZoomMapTool: MapTool = {
  id: "drag-pan-zoom-map-tool",
  Component: (props) => {
    usePinchWheelZoom(props.mapContext);
    props.useMapGesture({
      onDrag: ({ movement, memo, event }) => {
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
      },
    });
    return null;
  },
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
