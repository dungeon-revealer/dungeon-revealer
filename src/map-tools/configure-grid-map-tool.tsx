import * as React from "react";
import { usePinchWheelZoom } from "./drag-pan-zoom-map-tool";
import type { MapTool } from "./map-tool";
import { ThreeLine } from "../three-line";
import { Rectangle } from "./area-select-map-tool";

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

export const ConfigureGridMapToolContext =
  React.createContext<ConfigureGridMapToolContextValue>(undefined as any);

export const ConfigureGridMapTool: MapTool = {
  id: "configure-grid-map-tool",
  Component: (props) => {
    const configureGridContext = React.useContext(ConfigureGridMapToolContext);
    usePinchWheelZoom(props.mapContext);
    props.useMapGesture({
      onDrag: ({ delta, movement, memo, event }) => {
        event.stopPropagation();

        if (props.mapContext.isAltPressed) {
          configureGridContext.setState((state) => ({
            ...state,
            offsetX: state.offsetX + delta[0],
            offsetY: state.offsetY + delta[1],
          }));
        } else {
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
        }
      },
    });

    const [offsetX, offsetY] =
      props.mapContext.helper.coordinates.canvasToThree(
        props.mapContext.helper.coordinates.imageToCanvas([
          configureGridContext.state.offsetX,
          configureGridContext.state.offsetY,
        ])
      );

    const [columnWidth, columnHeight] =
      props.mapContext.helper.vector.canvasToThree(
        props.mapContext.helper.vector.imageToCanvas([
          configureGridContext.state.columnWidth,
          configureGridContext.state.columnHeight,
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
          borderColor="red"
        />
      </>
    );
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
    let i = 0;

    do {
      i++;
      elements.push(
        <ThreeLine
          key={String(i)}
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
      i++;
      elements.push(
        <ThreeLine
          key={String(i)}
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
      i++;
      elements.push(
        <ThreeLine
          key={String(i)}
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
      i++;
      elements.push(
        <ThreeLine
          key={String(i)}
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
