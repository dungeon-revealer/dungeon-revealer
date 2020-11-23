import type { SpringValue, SpringStartFn } from "react-spring";
import type { Dimensions } from "../map-view";
import type { ViewportData, PointerEvent } from "react-three-fiber";
import type { Handler } from "react-use-gesture/dist/types";

export type SharedMapToolState = {
  mapImage: HTMLImageElement;
  fogCanvas: HTMLCanvasElement;
  fogTexture: THREE.CanvasTexture;
  mapState: {
    position: SpringValue<[number, number, number]>;
    scale: SpringValue<[number, number, number]>;
  };
  setMapState: SpringStartFn<{
    position: [number, number, number];
    scale: [number, number, number];
  }>;
  dimensions: Dimensions;
  viewport: ViewportData;
};

/**
 * Utility for keeping the tools logic isolated.
 */
export type MapTool<MutableState = unknown, ContextState = unknown> = {
  // Create a mutable state that is available as long as the tool is active.
  // It can be used for storing information about the cursor position or selected elements.
  // All information inside createMutableState should not trigger any re-renders
  createMutableState: () => MutableState;
  // The context that will be used for injecting additional state into the handlers/component.
  // A usage example is a context that holds information about the brush size; which can be configured
  // in a component somewhere else in the React component tree.
  Context: React.Context<ContextState>;
  // A component that will be rendered inside the map with all necessary props injected.
  Component: (props: {
    contextState: ContextState;
    mutableState: MutableState;
    mapContext: SharedMapToolState;
  }) => React.ReactElement | null;
  // Handler for pointer down events.
  onPointerDown?: (
    event: PointerEvent,
    context: SharedMapToolState,
    mutableState: MutableState,
    contextState: ContextState
  ) => void;
  // Handler for pointer down events.
  onPointerUp?: (
    event: PointerEvent,
    context: SharedMapToolState,
    mutableState: MutableState,
    contextState: ContextState
  ) => void;
  // Handler for pointer move events.
  onPointerMove?: (
    event: PointerEvent,
    context: SharedMapToolState,
    mutableState: MutableState,
    contextState: ContextState
  ) => void;
  // Handler for drag events.
  onDrag?: (
    event: Parameters<Handler<"drag", PointerEvent>>[0],
    context: SharedMapToolState,
    mutableState: MutableState,
    contextState: ContextState
  ) => any | void;
};
