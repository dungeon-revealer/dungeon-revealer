import * as React from "react";
import { useGesture } from "react-use-gesture";
import { usePinchWheelZoom } from "./drag-pan-zoom-map-tool";
import type { MapTool } from "./map-tool";
import { ThreeLine } from "../three-line";
import { Rectangle } from "./area-select-map-tool";
import { useIsKeyPressed } from "../hooks/use-is-key-pressed";

export type ConfigureMapToolState = {
  offsetY: number;
  offsetX: number;
  columnWidth: number;
  columnHeight: number;
};

type ConfigureGridMapToolContextValue = {
  state: ConfigureMapToolState;
  setState: React.Dispatch<React.SetStateAction<ConfigureMapToolState>>;
};

export const ConfigureGridMapToolContext = React.createContext<ConfigureGridMapToolContextValue>(
  undefined as any
);

export const ConfigureGridMapTool: MapTool<
  {},
  ConfigureGridMapToolContextValue
> = {
  id: "configure-grid-map-tool",
  Context: ConfigureGridMapToolContext,
  createLocalState: () => ({}),
  Component: (props) => {
    const step = 0.02;

    const isPressingAltKey = useIsKeyPressed("Alt");

    usePinchWheelZoom(props.mapContext);

    useGesture<{
      onKeyDown: KeyboardEvent;
    }>(
      {
        onKeyDown: (args) => {
          //   if (args.event.key === "ArrowUp") {
          //     setPosition(([x, y, z]) => [x, y + step, z]);
          //   }
          //   if (args.event.key === "ArrowDown") {
          //     setPosition(([x, y, z]) => [x, y - step, z]);
          //   }
          //   if (args.event.key === "ArrowLeft") {
          //     setPosition(([x, y, z]) => [x - step, y, z]);
          //   }
          //   if (args.event.key === "ArrowRight") {
          //     setPosition(([x, y, z]) => [x + step, y, z]);
          //   }
          if (args.event.key === "+") {
            // setWidth((width) => width + 0.01);
          }
          if (args.event.key === "-") {
            // setWidth((width) => width - 0.01);
          }
        },
      },
      {
        domTarget: window.document,
      }
    );

    const [
      offsetX,
      offsetY,
    ] = props.mapContext.helper.coordinates.canvasToThree(
      props.mapContext.helper.coordinates.imageToCanvas([
        props.contextState.state.offsetX,
        props.contextState.state.offsetY,
      ])
    );

    const [
      columnWidth,
      columnHeight,
    ] = props.mapContext.helper.vector.canvasToThree(
      props.mapContext.helper.vector.imageToCanvas([
        props.contextState.state.columnWidth,
        props.contextState.state.columnHeight,
      ])
    );

    return (
      <>
        <CompleteGrid
          position={[offsetX + columnWidth, offsetY - columnHeight, 0]}
          columnWidth={columnWidth}
          columnHeight={columnHeight}
          dimensions={props.mapContext.dimensions}
        />
        <Rectangle
          p1={[offsetX, offsetY, 0]}
          p2={[offsetX + columnWidth, offsetY - columnHeight, 0]}
          color="blue"
        />
      </>
    );
  },
  onDrag: ({ delta, movement, memo, event }, context, _, contextValue) => {
    event.stopPropagation();

    if (context.isAltPressed) {
      contextValue.setState((state) => ({
        ...state,
        offsetX: state.offsetX + delta[0],
        offsetY: state.offsetY + delta[1],
      }));
    } else {
      memo = memo ?? context.mapState.position.get();
      context.setMapState({
        position: [
          memo[0] + movement[0] / context.viewport.factor,
          memo[1] - movement[1] / context.viewport.factor,
          0,
        ],
        immediate: true,
      });
      return memo;
    }
  },
};

const CompleteGrid = (props: {
  position: [number, number, number];
  columnHeight: number;
  columnWidth: number;
  dimensions: {
    width: number;
    height: number;
  };
}): React.ReactElement => {
  return React.useMemo(() => {
    const elements: React.ReactElement[] = [];
    let currentY = props.position[1] - props.columnHeight;

    const lineWidth = 0.1;
    const gridColor = "red";

    do {
      elements.push(
        <ThreeLine
          points={[
            [(-1 * props.dimensions.width) / 2, currentY, 0],
            [props.dimensions.width / 2, currentY, 0],
          ]}
          lineWidth={lineWidth}
          color={gridColor}
        />
      );
      currentY = currentY - props.columnHeight;
    } while (currentY > (-1 * props.dimensions.height) / 2);

    currentY = props.position[1] - props.columnHeight;

    do {
      elements.push(
        <ThreeLine
          points={[
            [(-1 * props.dimensions.width) / 2, currentY, 0],
            [props.dimensions.width / 2, currentY, 0],
          ]}
          lineWidth={lineWidth}
          color={gridColor}
        />
      );
      currentY = currentY + props.columnHeight;
    } while (currentY < props.dimensions.height / 2);

    let currentX = props.position[0] - props.columnWidth;
    do {
      elements.push(
        <ThreeLine
          points={[
            [currentX, (-1 * props.dimensions.height) / 2, 0],
            [currentX, props.dimensions.height / 2, 0],
          ]}
          lineWidth={lineWidth}
          color={gridColor}
        />
      );
      currentX = currentX - props.columnWidth;
    } while (currentX > (-1 * props.dimensions.width) / 2);

    currentX = props.position[0] - props.columnWidth;

    do {
      elements.push(
        <ThreeLine
          points={[
            [currentX, (-1 * props.dimensions.height) / 2, 0],
            [currentX, props.dimensions.height / 2, 0],
          ]}
          lineWidth={lineWidth}
          color={gridColor}
        />
      );
      currentX = currentX + props.columnWidth;
    } while (currentX < props.dimensions.width / 2);

    return <>{elements}</>;
  }, [props.columnWidth, props.columnHeight, props.dimensions, props.position]);
};
