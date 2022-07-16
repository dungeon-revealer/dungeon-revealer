import * as React from "react";
import type { SpringValue, SpringStartFn } from "react-spring";
import type { Dimensions } from "../map-view";
import type { ViewportData, PointerEvent } from "react-three-fiber";
import type { Handlers } from "react-use-gesture/dist/types";
import {
  mapView_GridRendererFragment,
  mapView_GridRendererFragment$key,
} from "../__generated__/mapView_GridRendererFragment.graphql";
import { MapGridEntity } from "../map-typings";

type Vector2D = [number, number];
type Vector3D = [number, number, number];

export type SharedMapToolState = {
  ratio: number;
  mapImage: HTMLImageElement;
  mapCanvas: HTMLCanvasElement;
  fogCanvas: HTMLCanvasElement;
  fogTexture: THREE.CanvasTexture;
  mapState: {
    position: SpringValue<Vector3D>;
    scale: SpringValue<Vector3D>;
  };
  setMapState: SpringStartFn<{
    position: Vector3D;
    scale: Vector3D;
  }>;
  dimensions: Dimensions;
  viewport: ViewportData;
  isDragAllowed: React.MutableRefObject<boolean>;
  isAltPressed: boolean;
  /* The current pointer position on the three.js canvas */
  pointerPosition: SpringValue<Vector3D>;
  helper: {
    threePointToImageCoordinates: (vector: Vector2D) => Vector2D;
    imageCoordinatesToThreePoint: (vector: Vector2D) => Vector2D;
    size: {
      fromImageToThree: (value: number) => number;
    };
    vector: {
      /* convert three.js vector to canvas vector */
      threeToCanvas: (vector: Vector2D) => Vector2D;
      /* convert canvas vector to three.js vector */
      canvasToThree: (vector: Vector2D) => Vector2D;
      /* convert canvas vector to image coordinate */
      canvasToImage: (vector: Vector2D) => Vector2D;
      /* convert image vector to canvas vector */
      imageToCanvas: (vector: Vector2D) => Vector2D;
    };
    coordinates: {
      /* convert three.js coordinate to canvas coordinate */
      threeToCanvas: (vector: Vector2D) => Vector2D;
      /* convert canvas coordinate to three.js coordinate */
      canvasToThree: (vector: Vector2D) => Vector2D;
      /* convert canvas coordinate to image coordinate */
      canvasToImage: (vector: Vector2D) => Vector2D;
      /* convert image coordinate to canvas coordinate */
      imageToCanvas: (vector: Vector2D) => Vector2D;
      /* convert screen coordinate to image relative coordinate */
      screenToImage: (vector: Vector2D) => Vector2D;
    };
  };
  grid: MapGridEntity;
};

export type MapToolMapGestureHandlers = Handlers<{
  onPointerDown: PointerEvent;
  onPointerUp: PointerEvent;
  onPointerMove: PointerEvent;
  onDrag: PointerEvent;
  onClick: PointerEvent;
}>;

/**
 * Utility for keeping the tools logic isolated.
 */
export type MapTool = {
  id: string;
  // A component that will be rendered inside the map with all necessary props injected.
  Component: (props: {
    mapContext: SharedMapToolState;
    useMapGesture: (params: MapToolMapGestureHandlers) => void;
  }) => React.ReactElement | null;
};
