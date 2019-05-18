import React, { useEffect, useRef } from "react";
import debounce from "lodash/debounce";
import createPersistedState from "use-persisted-state";
import { PanZoom } from "react-easy-panzoom";
import ReactTooltip from "react-tooltip";
import Referentiel from "referentiel";
import { loadImage, getOptimalDimensions } from "./../util";

const DropletIcon = ({ fill, filled, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? fill : "none"}
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const MoveIcon = ({ fill, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
  </svg>
);

const CropIcon = ({ fill, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" />
    <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" />
  </svg>
);

const PenIcon = ({ fill, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586" />
    <circle cx={11} cy={11} r={2} />
  </svg>
);

const EyeIcon = ({ fill, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx={12} cy={12} r={3} />
  </svg>
);

const EyeOffIcon = ({ fill, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
  </svg>
);

const MapIcon = ({ fill, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" />
  </svg>
);

const SendIcon = ({ fill, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

const RadioIcon = ({ fill, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx={12} cy={12} r={2} />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
  </svg>
);

const PauseIcon = ({ fill, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx={12} cy={12} r={10} />
    <path d="M10 15V9M14 15V9" />{" "}
  </svg>
);

const IconLabel = ({ children, color }) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: "bold",
      color
    }}
  >
    {children}
  </div>
);

const ToolbarContext = React.createContext({ horizontal: false });

const ToolbarLogo = () => {
  return (
    <div
      style={{
        backgroundColor: "rgb(34, 60, 7, 1)",
        paddingTop: 25,
        paddingBottom: 15,
        fontSize: 20,
        fontWeight: "bold",
        color: "rgba(255, 255, 255, 1)",
        marginBottom: 24,
        fontFamily: "folkard, palitino, serif"
      }}
    >
      DR
    </div>
  );
};

const Toolbar = ({ children, style, horizontal }) => {
  const contextValue = React.useMemo(() => ({ horizontal }), [horizontal]);

  return (
    <ToolbarContext.Provider value={contextValue}>
      <div
        style={{
          pointerEvents: "all",
          boxShadow: "0 0 15px rgba(0, 0, 0, .1)",
          borderRadius: 15,

          backgroundColor: "rgba(255, 255, 255, 1)",
          textAlign: "center",
          overflow: "hidden",
          ...(!horizontal
            ? {
                width: 80,
                height: "max-content"
              }
            : {
                display: "flex",
                width: "max-content",
                height: 80,
                alignItems: "center"
              }),
          ...style
        }}
      >
        {children}
      </div>
    </ToolbarContext.Provider>
  );
};

Toolbar.Group = ({ children, style, divider, ...props }) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { horizontal } = React.useContext(ToolbarContext);

  let display = "block";
  let marginTop = 16;
  let marginLeft = 12;
  let marginRight = 12;
  let paddingBottom = 12;
  let borderBottom = "none";
  let borderRight = "none";

  if (horizontal) {
    display = "flex";
    marginTop = 0;
    marginLeft = 16;
    marginRight = 16;
    paddingBottom = 0;
  }

  if (divider) {
    if (horizontal) {
      borderRight = "1px solid rgba(222, 222, 222, .7)";
    } else {
      borderBottom = "1px solid rgba(222, 222, 222, .7)";
    }
  }

  return (
    <ul
      style={{
        display,
        padding: 0,
        margin: 0,
        listStyle: "none",
        marginTop,
        marginRight,
        marginLeft,
        paddingBottom,
        borderBottom,
        borderRight,
        ...style
      }}
      {...props}
    >
      {children}
    </ul>
  );
};

Toolbar.Item = ({ children, isActive, style, ...props }) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { horizontal } = React.useContext(ToolbarContext);

  let flex = "none";
  let minWidth = "none";
  let marginBottom = 8;
  let paddingBottom = 8;
  let paddingTop = 8;
  let marginLeft = 0;
  let paddingRight = 0;
  let marginRight = 0;

  if (horizontal) {
    marginBottom = paddingBottom = paddingTop = 0;
    marginLeft = paddingRight = marginRight = 8;
    flex = 1;
    minWidth = 80;
  }

  return (
    <li
      style={{
        display: "block",
        flex,
        minWidth,
        cursor: props.onClick ? "pointer" : "inherit",
        marginBottom,
        paddingBottom,
        paddingTop,
        marginLeft,
        paddingRight,
        marginRight,

        ...(isActive
          ? { filter: "drop-shadow( 0 0 4px rgba(0, 0, 0, .3))" }
          : {}),
        ...style
      }}
      {...props}
    >
      {children}
    </li>
  );
};

const midPointBtw = (p1, p2) => {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2
  };
};

const distanceBetweenCords = (cords1, cords2) => {
  const a = cords1.x - cords2.x;
  const b = cords1.y - cords2.y;

  const distance = Math.sqrt(a * a + b * b);

  return distance;
};

const orderByProperty = (prop, ...args) => {
  return function(a, b) {
    const equality = a[prop] - b[prop];
    if (equality === 0 && arguments.length > 1) {
      return orderByProperty.apply(null, args)(a, b);
    }
    return equality;
  };
};

const constructCoordinates = (coords, lineWidth) => {
  // Corners
  // 1 - bottom left
  // 2 - top left
  // 3 - top right
  // 4 - bottom right

  // Note: 0,0 starts in top left. Remember this when doing calculations for corners, the y axis calculations
  // need to be flipped vs bottom left orientation

  const r = lineWidth / 2;
  return {
    1: {
      x: coords.x - r,
      y: coords.y + r
    },
    2: {
      x: coords.x - r,
      y: coords.y - r
    },
    3: {
      x: coords.x + r,
      y: coords.y - r
    },
    4: {
      x: coords.x + r,
      y: coords.y + r
    }
  };
};

const findOptimalRhombus = (pointCurrent, pointPrevious, lineWidth) => {
  // Find midpoint between two points
  const midPoint = midPointBtw(pointPrevious, pointCurrent);

  // Exten d points to coordinates
  const pointCurrentCoordinates = constructCoordinates(pointCurrent, lineWidth);
  const pointPreviousCoordinates = constructCoordinates(
    pointPrevious,
    lineWidth
  );

  // Arrays and Objects
  const allPoints = []; // All points are placed into this array
  const counts = {}; // count distinct of distances
  let limitedPoints; // subset of correct points

  // Load the points into allpoints with a field documenting their origin and corner
  for (const key in pointCurrentCoordinates) {
    pointCurrentCoordinates[key].corner = key;
    pointCurrentCoordinates[key].version = 2;
    allPoints.push(pointCurrentCoordinates[key]);
  }
  for (const key in pointPreviousCoordinates) {
    pointPreviousCoordinates[key].corner = key;
    pointPreviousCoordinates[key].version = 1;
    allPoints.push(pointPreviousCoordinates[key]);
  }

  // For each point find the distance between the cord and the midpoint
  for (
    let j = 0, allPointsLength = allPoints.length;
    j < allPointsLength;
    j++
  ) {
    allPoints[j].distance = distanceBetweenCords(
      midPoint,
      allPoints[j]
    ).toFixed(10);
  }

  // count distinct distances into counts object
  allPoints.forEach(function(x) {
    const distance = x.distance;
    counts[distance] = (counts[distance] || 0) + 1;
  });

  // Sort allPoints by distance
  allPoints.sort(function(a, b) {
    return a.distance - b.distance;
  });

  // There are three scenarios
  // 1. the squares are perfectly vertically or horizontally aligned:
  ////  In this case, there will be two distinct lengths between the mid point, In this case, we want to take
  ////  the coordinates with the shortest distance to the midpoint
  // 2. The squares are offset vertically and horizontally. In this case, there will be 3 or 4 distinct lengths between
  ////  the coordinates, 2 that are the shortest, 4 that are in the middle, and 2 that are the longest. We want
  ////  the middle 4

  // Determine the number of distances
  const numberOfDistances = Object.keys(counts).length;

  if (numberOfDistances === 2) {
    limitedPoints = allPoints.slice(0, 4);
  } else if (numberOfDistances === 3 || numberOfDistances === 4) {
    limitedPoints = allPoints.slice(2, 6);
  } else {
    // if the distance is all the same, the square masks haven't moved, so just return
    return;
  }

  // error checking
  if (limitedPoints.length !== 4) {
    throw new Error("unexpected number of points");
  }

  const limitedPointsSorted = limitedPoints.sort(
    orderByProperty("corner", "version")
  );
  if (numberOfDistances > 2) {
    // for horizontally and verically shifted, the sort order needs a small hack so the drawing of the
    // rectangle works correctly
    const temp = limitedPointsSorted[2];
    limitedPointsSorted[2] = limitedPointsSorted[3];
    limitedPointsSorted[3] = temp;
  }
  return limitedPointsSorted;
};

const useModeState = createPersistedState("dm.settings.mode");
const useBrushShapeState = createPersistedState("dm.settings.brushShape");
const useToolState = createPersistedState("dm.settings.tool");
const useLineWidthState = createPersistedState("dm.settings.lineWidth");

/**
 * loadedMapId = id of the map that is currently visible in the editor
 * liveMapId = id of the map that is currently visible to the players
 */
export const DmMap = ({
  loadedMapId,
  liveMapId,
  sendLiveMap,
  hideMap,
  showMapModal
}) => {
  const mapContainerRef = useRef(null);
  const mapCanvasRef = useRef(null);
  const fogCanvasRef = useRef(null);
  const mouseCanvasRef = useRef(null);
  const drawState = useRef({ isDrawing: false, lastCoords: null });
  const areaDrawState = useRef({ startCoords: null, currentCoords: null });
  const hasPreviousMap = useRef(false);
  const panZoomRef = useRef(null);
  const panZoomReferentialRef = useRef(null);

  /**
   * function for saving the fog to the server.
   */
  const saveFogCanvasRef = useRef(null);

  const [mode, setMode] = useModeState("clear");
  const [brushShape, setBrushShape] = useBrushShapeState("square");
  const [tool, setTool] = useToolState("brush"); // "brush" or "area"
  const [lineWidth, setLineWidth] = useLineWidthState(15);

  const fillFog = () => {
    if (!fogCanvasRef.current) {
      return;
    }
    const context = fogCanvasRef.current.getContext("2d");

    context.globalCompositeOperation = "source-over";
    context.fillStyle = "black";
    context.fillRect(
      0,
      0,
      fogCanvasRef.current.width,
      fogCanvasRef.current.height
    );

    if (saveFogCanvasRef.current) {
      saveFogCanvasRef.current();
    }
  };

  const constructMask = coords => {
    const maskDimensions = {
      x: coords.x,
      y: coords.y,
      lineWidth: 2,
      line: "aqua",
      fill: "transparent"
    };

    if (brushShape === "round") {
      maskDimensions.r = lineWidth / 2;
      maskDimensions.startingAngle = 0;
      maskDimensions.endingAngle = Math.PI * 2;
    } else if (brushShape === "square") {
      maskDimensions.centerX = maskDimensions.x - lineWidth / 2;
      maskDimensions.centerY = maskDimensions.y - lineWidth / 2;
      maskDimensions.height = lineWidth;
      maskDimensions.width = lineWidth;
    } else {
      throw new Error("brush shape not found");
    }

    return maskDimensions;
  };

  const clearFog = () => {
    if (!fogCanvasRef.current) {
      return;
    }
    const context = fogCanvasRef.current.getContext("2d");
    context.clearRect(
      0,
      0,
      fogCanvasRef.current.width,
      fogCanvasRef.current.height
    );

    if (saveFogCanvasRef.current) {
      saveFogCanvasRef.current();
    }
  };

  const getMapDisplayRatio = () => {
    return (
      parseFloat(mapCanvasRef.current.style.width, 10) /
      mapCanvasRef.current.width
    );
  };

  const getMouseCoordinates = ev => {
    const ratio = getMapDisplayRatio();
    const [x, y] = panZoomReferentialRef.current.global_to_local([
      ev.clientX,
      ev.clientY
    ]);

    return {
      x: x / ratio,
      y: y / ratio
    };
  };

  const getTouchCoordinates = ev => {
    const viewportOffset = fogCanvasRef.current.getBoundingClientRect();
    const borderTop = parseInt(fogCanvasRef.current.style.borderTopWidth || 0);
    const borderLeft = parseInt(
      fogCanvasRef.current.style.borderLeftWidth || 0
    );

    return {
      x:
        (ev.touches[0].pageX -
          viewportOffset.left -
          borderLeft -
          document.documentElement.scrollLeft) /
        getMapDisplayRatio(),
      y:
        (ev.touches[0].pageY -
          viewportOffset.top -
          borderTop -
          document.documentElement.scrollTop) /
        getMapDisplayRatio()
    };
  };

  const drawInitial = coords => {
    const fogMask = constructMask(coords);
    const fogContext = fogCanvasRef.current.getContext("2d");
    fogContext.lineWidth = fogMask.lineWidth;
    if (mode === "clear") {
      fogContext.globalCompositeOperation = "destination-out";
    } else {
      fogContext.globalCompositeOperation = "source-over";
    }

    fogContext.beginPath();
    if (brushShape === "round") {
      fogContext.arc(
        fogMask.x,
        fogMask.y,
        fogMask.r,
        fogMask.startingAngle,
        fogMask.endingAngle,
        true
      );
    } else if (brushShape === "square") {
      fogContext.rect(
        fogMask.centerX,
        fogMask.centerY,
        fogMask.height,
        fogMask.width
      );
    }

    fogContext.fill();
  };

  const drawCursor = ({ x, y }) => {
    const mouseContext = mouseCanvasRef.current.getContext("2d");
    // draw cursor
    mouseContext.clearRect(
      0,
      0,
      mouseCanvasRef.current.width,
      mouseCanvasRef.current.height
    );

    if (tool === "area") {
      mouseContext.strokeStyle = "aqua";
      mouseContext.fillStyle = "aqua";
      mouseContext.lineWidth = 2;

      mouseContext.beginPath();
      mouseContext.moveTo(x - 10, y);
      mouseContext.lineTo(x + 10, y);
      mouseContext.moveTo(x, y - 10);
      mouseContext.lineTo(x, y + 10);
      mouseContext.stroke();
      return;
    }

    // brush

    const cursorMask = constructMask({ x, y });
    mouseContext.strokeStyle = cursorMask.line;
    mouseContext.fillStyle = cursorMask.fill;
    mouseContext.lineWidth = cursorMask.lineWidth;

    mouseContext.beginPath();
    if (brushShape === "round") {
      mouseContext.arc(
        cursorMask.x,
        cursorMask.y,
        cursorMask.r,
        cursorMask.startingAngle,
        cursorMask.endingAngle,
        true
      );
    } else if (brushShape === "square") {
      mouseContext.rect(
        cursorMask.centerX,
        cursorMask.centerY,
        cursorMask.height,
        cursorMask.width
      );
    }

    mouseContext.fill();
    mouseContext.stroke();
  };

  const drawFog = (lastCoords, coords) => {
    if (!lastCoords) {
      return drawInitial(coords);
    }

    const fogContext = fogCanvasRef.current.getContext("2d");
    if (mode === "clear") {
      fogContext.globalCompositeOperation = "destination-out";
    } else {
      fogContext.globalCompositeOperation = "source-over";
    }

    if (brushShape === "round") {
      fogContext.lineWidth = lineWidth;
      fogContext.lineJoin = fogContext.lineCap = "round";
      fogContext.beginPath();
      fogContext.moveTo(lastCoords.x, lastCoords.y);

      const midPoint = midPointBtw(lastCoords, coords);
      fogContext.quadraticCurveTo(
        lastCoords.x,
        lastCoords.y,
        midPoint.x,
        midPoint.y
      );
      fogContext.lineTo(coords.x, coords.y);
      fogContext.stroke();
    } else if (brushShape === "square") {
      // The goal of this area is to draw lines with a square mask

      // The fundamental issue is that not every position of the mouse is recorded when it is moved
      // around the canvas (particularly when it is moved fast). If it were, we could simply draw a
      // square at every single coordinate

      // a simple approach is to draw an initial square then connect a line to a series of
      // central cords with a square lineCap. Unfortunately, this has undesirable behavior. When moving in
      // a diagonal, the square linecap rotates into a diamond, and "draws" outside of the square mask.

      // Using 'butt' lineCap lines to connect between squares drawn at each set of cords has unexpected behavior.
      // When moving in a diagonal fashion. The width does not correspond to the "face" of the cursor, which
      // maybe longer then the length / width (think hypotenuse) which results in weird drawing.

      // The current solution is two fold
      // 1. Draw a rectangle at every available cord
      // 2. Find and draw the optimal rhombus to connect each square
      fogContext.lineWidth = 1;
      fogContext.beginPath();

      const fowMask = constructMask(lastCoords);
      fogContext.fillRect(
        fowMask.centerX,
        fowMask.centerY,
        fowMask.height,
        fowMask.width
      );

      // optimal polygon to draw to connect two square
      const optimalPoints = findOptimalRhombus(coords, lastCoords, lineWidth);
      if (optimalPoints) {
        fogContext.moveTo(optimalPoints[0].x, optimalPoints[0].y);
        fogContext.lineTo(optimalPoints[1].x, optimalPoints[1].y);
        fogContext.lineTo(optimalPoints[2].x, optimalPoints[2].y);
        fogContext.lineTo(optimalPoints[3].x, optimalPoints[3].y);
        fogContext.fill();
      }
    }
  };

  const drawAreaSelection = () => {
    const mouseContext = mouseCanvasRef.current.getContext("2d");
    mouseContext.clearRect(
      0,
      0,
      mouseCanvasRef.current.width,
      mouseCanvasRef.current.height
    );

    mouseContext.strokeStyle = "aqua";
    mouseContext.fillStyle = "transparent";
    mouseContext.lineWidth = 2;

    mouseContext.beginPath();

    const { startCoords, currentCoords } = areaDrawState.current;

    const startX = startCoords.x;
    const startY = startCoords.y;
    const width = currentCoords.x - startCoords.x;
    const height = currentCoords.y - startCoords.y;

    mouseContext.rect(startX, startY, width, height);
    mouseContext.fill();
    mouseContext.stroke();
  };

  const handleAreaSelection = () => {
    const context = fogCanvasRef.current.getContext("2d");

    if (mode === "clear") {
      context.globalCompositeOperation = "destination-out";
    } else {
      context.globalCompositeOperation = "source-over";
    }
    context.beginPath();
    const { startCoords, currentCoords } = areaDrawState.current;

    const startX = startCoords.x;
    const startY = startCoords.y;
    const width = currentCoords.x - startCoords.x;
    const height = currentCoords.y - startCoords.y;
    context.fillRect(startX, startY, width, height);
    drawCursor(currentCoords);
  };

  useEffect(() => {
    panZoomReferentialRef.current = new Referentiel(
      panZoomRef.current.dragContainer
    );

    const mousewheelListener = debounce(() => {
      panZoomReferentialRef.current = new Referentiel(
        panZoomRef.current.dragContainer
      );
    }, 500);

    document.addEventListener("mousewheel", mousewheelListener);

    return () => {
      panZoomReferentialRef.current = null;
      document.removeEventListener("mousewheel", mousewheelListener);
      mousewheelListener.cancel();
    };
  }, []);

  useEffect(() => {
    if (!loadedMapId) {
      return () => {
        hasPreviousMap.current = false;
      };
    }

    const centerMap = (isInitial = false) => {
      if (!panZoomRef.current) {
        return;
      }
      // hacky approach for centering the map initially
      // (there is no API for react-native-panzoom to do the autofocus without a transition)
      if (isInitial) {
        const transition = panZoomRef.current.dragContainer.style.transition;
        panZoomRef.current.dragContainer.style.transition = "none";
        setTimeout(() => {
          panZoomRef.current.dragContainer.style.transition = transition;
        }, 500);
      }
      panZoomRef.current.autoCenter(0.85);
    };

    let tasks = [
      loadImage(`/map/${loadedMapId}/map`),
      loadImage(`/map/${loadedMapId}/fog`)
    ];

    Promise.all([
      tasks[0].promise,
      tasks[1].promise.catch(() => {
        return null;
      })
    ])
      .then(([map, fog]) => {
        tasks = null;
        const dimensions = getOptimalDimensions(
          map.width,
          map.height,
          3000,
          8000
        );
        mapCanvasRef.current.width = dimensions.width;
        mapCanvasRef.current.height = dimensions.height;
        fogCanvasRef.current.width = dimensions.width;
        fogCanvasRef.current.height = dimensions.height;
        mouseCanvasRef.current.width = dimensions.width;
        mouseCanvasRef.current.height = dimensions.height;

        const widthPx = `${dimensions.width}px`;
        const heightPx = `${dimensions.height}px`;
        mapContainerRef.current.style.width = mapCanvasRef.current.style.width = fogCanvasRef.current.style.width = widthPx;
        mapContainerRef.current.style.height = mapCanvasRef.current.style.height = fogCanvasRef.current.style.height = heightPx;

        mapCanvasRef.current
          .getContext("2d")
          .drawImage(map, 0, 0, dimensions.width, dimensions.height);

        centerMap(true);

        if (!fog) {
          fillFog();
          return;
        }

        fogCanvasRef.current
          .getContext("2d")
          .drawImage(fog, 0, 0, dimensions.width, dimensions.height);
      })
      .catch(err => {
        // @TODO: distinguish between network error (rertry?) and cancel error
        console.error(err);
      });

    saveFogCanvasRef.current = debounce(() => {
      if (!fogCanvasRef.current) {
        return;
      }
      fetch(`/map/${loadedMapId}/fog`, {
        method: "POST",
        body: JSON.stringify({
          image: fogCanvasRef.current.toDataURL("image/png")
        }),
        headers: {
          "Content-Type": "application/json"
        }
      });
    }, 500);

    return () => {
      if (tasks) {
        tasks.forEach(task => {
          task.cancel();
        });
      }
      hasPreviousMap.current = true;
      saveFogCanvasRef.current.cancel();
    };
  }, [loadedMapId]);

  const isCurrentMapLive = liveMapId && loadedMapId === liveMapId;
  const isOtherMapLive = liveMapId && loadedMapId !== liveMapId;

  return (
    <>
      <PanZoom
        onPanEnd={() => {
          panZoomReferentialRef.current = new Referentiel(
            panZoomRef.current.dragContainer
          );
        }}
        disabled={tool !== "move"}
        style={{
          cursor: tool !== "move" ? "inherit" : "move",
          outline: "none",
          height: "100vh",
          width: "100vw"
        }}
        ref={panZoomRef}
      >
        <div ref={mapContainerRef}>
          <canvas ref={mapCanvasRef} style={{ position: "absolute" }} />
          <canvas
            ref={fogCanvasRef}
            style={{ position: "absolute", opacity: 0.5 }}
          />
          <canvas
            ref={mouseCanvasRef}
            style={{ position: "absolute", touchAction: "none" }}
            onMouseMove={ev => {
              if (tool === "move") {
                return;
              }

              const coords = getMouseCoordinates(ev);
              drawCursor(coords);

              if (tool === "area" && areaDrawState.current.startCoords) {
                if (areaDrawState.current.startCoords) {
                  areaDrawState.current.currentCoords = coords;
                  drawAreaSelection();
                }
                return;
              }

              if (!drawState.current.isDrawing) {
                return;
              }

              drawFog(drawState.current.lastCoords, coords);
              drawState.current.lastCoords = coords;
            }}
            onMouseLeave={() => {
              const mouseContext = mouseCanvasRef.current.getContext("2d");
              // draw cursor
              mouseContext.clearRect(
                0,
                0,
                mouseCanvasRef.current.width,
                mouseCanvasRef.current.height
              );

              if (
                (drawState.current.isDrawing || drawState.current.lastCoords) &&
                saveFogCanvasRef.current
              ) {
                saveFogCanvasRef.current();
              }

              drawState.current.isDrawing = false;
              drawState.current.lastCoords = null;
              areaDrawState.current.currentCoords = null;
              areaDrawState.current.startCoords = null;
            }}
            onMouseDown={ev => {
              const coords = getMouseCoordinates(ev);

              if (tool === "brush") {
                drawState.current.isDrawing = true;
                drawInitial(coords);
              } else if (tool === "area") {
                areaDrawState.current.startCoords = coords;
              }
            }}
            onMouseUp={() => {
              drawState.current.isDrawing = false;
              drawState.current.lastCoords = null;
              if (
                areaDrawState.current.currentCoords &&
                areaDrawState.current.startCoords
              ) {
                handleAreaSelection();
              }
              areaDrawState.current.currentCoords = null;
              areaDrawState.current.startCoords = null;

              if (saveFogCanvasRef.current) {
                saveFogCanvasRef.current();
              }
            }}
            onTouchStart={ev => {
              const coords = getTouchCoordinates(ev);
              if (tool === "brush") {
                drawState.current.isDrawing = true;
                drawInitial(coords);
              } else if (tool === "area") {
                areaDrawState.current.startCoords = coords;
              }
            }}
            onTouchMove={ev => {
              ev.preventDefault();
              const coords = getTouchCoordinates(ev);

              if (tool === "move") {
                return;
              } else if (tool === "area" && areaDrawState.current.startCoords) {
                areaDrawState.current.currentCoords = coords;
                drawAreaSelection();
                return;
              }

              if (!drawState.current.isDrawing) {
                return;
              }

              drawFog(drawState.current.lastCoords, coords);
              drawState.current.lastCoords = coords;
            }}
            onTouchEnd={() => {
              drawState.current.isDrawing = false;
              drawState.current.lastCoords = null;
              if (
                areaDrawState.current.currentCoords &&
                areaDrawState.current.startCoords
              ) {
                handleAreaSelection();
              }
              areaDrawState.current.currentCoords = null;
              areaDrawState.current.startCoords = null;

              if (saveFogCanvasRef.current) {
                saveFogCanvasRef.current();
              }
            }}
          />
        </div>
      </PanZoom>
      {/* <div className="btn-group">
            <button
              className="btn btn-default"
              onClick={() => {
                setLineWidth(lineWidth / 2 < 1 ? 1 : lineWidth / 2);
              }}
            >
              Shrink Brush
            </button>
            <button
              className="btn btn-default"
              onClick={() => {
                setLineWidth(lineWidth * 2 > 200 ? 200 : lineWidth * 2);
              }}
            >
              Enlarge Brush
            </button>
            <button
              className="btn btn-default"
              onClick={() => {
                if (brushShape === "square") {
                  setBrushShape("round");
                } else {
                  setBrushShape("square");
                }
              }}
            >
              {brushShape === "square" ? "Square Brush" : "Round Brush"}
            </button>
          </div>
          <div className="btn-group">
            */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          position: "absolute",
          width: "100%",
          left: 0,
          bottom: 12,
          pointerEvents: "none"
        }}
      >
        <Toolbar horizontal>
          <Toolbar.Group>
            <Toolbar.Item
              onClick={() => {
                showMapModal();
              }}
            >
              <MapIcon height={30} width={30} fill="rgba(0, 0, 0, 1)" />
              <IconLabel>Change Map</IconLabel>
            </Toolbar.Item>
            <Toolbar.Item onClick={hideMap}>
              <PauseIcon
                height={30}
                width={30}
                fill={
                  liveMapId !== null
                    ? "hsl(360, 83%, 62%)"
                    : "hsl(212, 33%, 89%)"
                }
              />
              <IconLabel
                color={
                  liveMapId !== null
                    ? "hsl(360, 83%, 62%)"
                    : "hsl(212, 33%, 89%)"
                }
              >
                Stop Sharing
              </IconLabel>
            </Toolbar.Item>
            {isCurrentMapLive ? (
              <Toolbar.Item data-tooltip="Currently loaded map is live">
                <RadioIcon height={30} width={30} fill="hsl(160, 51%, 49%)" />
                <IconLabel color="hsl(160, 51%, 49%)">Live</IconLabel>
              </Toolbar.Item>
            ) : isOtherMapLive ? (
              <Toolbar.Item data-tooltip="A different map is live">
                <RadioIcon height={30} width={30} fill="hsl(48, 94%, 68%)" />
                <IconLabel color="hsl(48, 94%, 68%)">Live</IconLabel>
              </Toolbar.Item>
            ) : (
              <Toolbar.Item data-tooltip="No map is currently live">
                <RadioIcon height={30} width={30} fill="hsl(212, 33%, 89%)" />
                <IconLabel color="hsl(212, 33%, 89%)">Not Live</IconLabel>
              </Toolbar.Item>
            )}
            <Toolbar.Item
              onClick={async () => {
                if (!fogCanvasRef.current) {
                  return;
                }
                sendLiveMap({
                  image: fogCanvasRef.current.toDataURL("image/png")
                });
              }}
            >
              <SendIcon height={30} width={30} fill="rgba(0, 0, 0, 1)" />
              <IconLabel>Send</IconLabel>
            </Toolbar.Item>
          </Toolbar.Group>
        </Toolbar>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "absolute",
          height: "100%",
          top: 0,
          left: 12,
          pointerEvents: "none"
        }}
      >
        <Toolbar>
          <ToolbarLogo />
          <Toolbar.Group divider>
            <Toolbar.Item
              isActive={tool === "move"}
              onClick={() => {
                setTool("move");
              }}
            >
              <MoveIcon
                height={30}
                width={30}
                fill={tool === "move" ? "rgb(34, 60, 7, 1)" : "grey"}
              />
              <IconLabel color={tool === "move" ? "rgb(34, 60, 7, 1)" : "grey"}>
                Move
              </IconLabel>
            </Toolbar.Item>
            <Toolbar.Item
              isActive={tool === "area"}
              onClick={() => {
                setTool("area");
              }}
            >
              <CropIcon
                height={30}
                width={30}
                fill={tool === "area" ? "rgb(34, 60, 7, 1)" : "grey"}
              />
              <IconLabel color={tool === "area" ? "rgb(34, 60, 7, 1)" : "grey"}>
                Select Area
              </IconLabel>
            </Toolbar.Item>
            <Toolbar.Item
              isActive={tool === "brush"}
              onClick={() => {
                setTool("brush");
              }}
              style={{ marginBottom: 0 }}
            >
              <PenIcon
                height={30}
                width={30}
                fill={tool === "brush" ? "rgb(34, 60, 7, 1)" : "grey"}
              />
              <IconLabel
                color={tool === "brush" ? "rgb(34, 60, 7, 1)" : "grey"}
              >
                Brush
              </IconLabel>
            </Toolbar.Item>
          </Toolbar.Group>
          <Toolbar.Group>
            <Toolbar.Item
              onClick={() => {
                if (mode === "clear") {
                  setMode("shroud");
                } else {
                  setMode("clear");
                }
              }}
            >
              {mode === "shroud" ? (
                <>
                  <EyeOffIcon height={30} width={30} fill="rgba(0, 0, 0, 1)" />
                  <IconLabel>Shroud</IconLabel>
                </>
              ) : (
                <>
                  <EyeIcon height={30} width={30} fill="rgba(0, 0, 0, 1)" />
                  <IconLabel>Reveal</IconLabel>
                </>
              )}
            </Toolbar.Item>
            <Toolbar.Item onClick={() => fillFog()}>
              <DropletIcon
                height={30}
                width={30}
                fill="rgba(0, 0, 0, 1)"
                filled
              />
              <IconLabel>Shroud All</IconLabel>
            </Toolbar.Item>
            <Toolbar.Item onClick={() => clearFog()}>
              <DropletIcon height={30} width={30} fill="rgba(0, 0, 0, 1)" />
              <IconLabel>Clear All</IconLabel>
            </Toolbar.Item>
          </Toolbar.Group>
        </Toolbar>
      </div>
      <ReactTooltip />
    </>
  );
};
