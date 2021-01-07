import orderBy from "lodash/orderBy";

export enum FogMode {
  clear = "clear",
  shroud = "shroud",
}

export enum BrushShape {
  square = "square",
  circle = "circle",
}

type Vector2D = [number, number];

const setCompositeMode = (
  fogMode: FogMode,
  context: CanvasRenderingContext2D
): void => {
  switch (fogMode) {
    case FogMode.clear: {
      context.globalCompositeOperation = "destination-out";
      break;
    }
    case FogMode.shroud: {
      context.globalCompositeOperation = "source-over";
      break;
    }
  }
};

export const applyInitialFog = (
  fogMode: FogMode,
  brushShape: BrushShape,
  brushSize: number,
  coordinates: Vector2D,
  context: CanvasRenderingContext2D
) => {
  context.lineWidth = 2;
  setCompositeMode(fogMode, context);

  context.beginPath();
  switch (brushShape) {
    case BrushShape.circle: {
      context.arc(
        coordinates[0],
        coordinates[1],
        brushSize / 2,
        0,
        Math.PI * 2,
        true
      );
      break;
    }
    case BrushShape.square: {
      context.rect(
        coordinates[0] - brushSize / 2,
        coordinates[1] - brushSize / 2,
        brushSize,
        brushSize
      );
      break;
    }
  }
  context.fill();
};

export const applyFogRectangle = (
  fogMode: FogMode,
  p1: Vector2D,
  p2: Vector2D,
  context: CanvasRenderingContext2D
) => {
  setCompositeMode(fogMode, context);
  context.beginPath();
  context.rect(p1[0], p1[1], p2[0] - p1[0], p2[1] - p1[1]);
  context.fill();
};

export const midBetweenPoints = (
  point1: Vector2D,
  point2: Vector2D
): Vector2D => [
  point1[0] + (point2[0] - point1[0]) / 2,
  point1[1] + (point2[1] - point1[1]) / 2,
];

export const applyFog = (
  fogMode: FogMode,
  brushShape: BrushShape,
  brushSize: number,
  from: Vector2D,
  to: Vector2D,
  context: CanvasRenderingContext2D
) => {
  setCompositeMode(fogMode, context);
  switch (brushShape) {
    case BrushShape.circle: {
      context.lineWidth = brushSize;
      context.lineJoin = context.lineCap = "round";
      context.beginPath();
      context.moveTo(from[0], from[1]);
      const midCoordinates = midBetweenPoints(from, to);
      context.quadraticCurveTo(
        from[0],
        from[1],
        midCoordinates[0],
        midCoordinates[1]
      );
      context.lineTo(to[0], to[1]);
      context.stroke();
      break;
    }
    case BrushShape.square: {
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
      context.lineWidth = 1;
      context.beginPath();
      context.fillRect(
        to[0] - brushSize / 2,
        to[1] - brushSize / 2,
        brushSize,
        brushSize
      );

      const optimalPoints = calculateOptimalRhombus(from, to, brushSize);
      if (optimalPoints) {
        context.moveTo(optimalPoints[0][0], optimalPoints[0][1]);
        context.lineTo(optimalPoints[1][0], optimalPoints[1][1]);
        context.lineTo(optimalPoints[2][0], optimalPoints[2][1]);
        context.lineTo(optimalPoints[3][0], optimalPoints[3][1]);
        context.fill();
      }
    }
  }
};

const calculateOptimalRhombus = (
  from: Vector2D,
  to: Vector2D,
  width: number
) => {
  const midCoordinates = midBetweenPoints(from, to);
  const fromSquareCoordinates = calculateSquareCoordinates(from, width);
  const toSquareCoordinates = calculateSquareCoordinates(to, width);
  const allPoints: Array<{
    corner: number;
    version: number;
    point: Vector2D;
    distance: number;
  }> = [];
  const counts = new Map<string, number>();
  let limitedPoints: Array<{
    corner: number;
    version: number;
    point: Vector2D;
    distance: number;
  }>;

  let corner: number = 1;
  for (const point of fromSquareCoordinates) {
    const record = {
      version: 1,
      corner,
      point,
      distance: distanceBetweenPoints(midCoordinates, point),
    };
    const d = record.distance.toFixed(10);
    const count = counts.get(d) ?? 0;
    counts.set(d, count + 1);
    allPoints.push(record);
    corner++;
  }
  corner = 1;
  for (const point of toSquareCoordinates) {
    const record = {
      version: 2,
      corner,
      point,
      distance: distanceBetweenPoints(midCoordinates, point),
    };
    const d = record.distance.toFixed(10);
    const count = counts.get(d) ?? 0;
    counts.set(d, count + 1);
    allPoints.push(record);
    corner++;
  }
  allPoints.sort((r1, r2) => r1.distance - r2.distance);

  // There are three scenarios
  // 1. the squares are perfectly vertically or horizontally aligned:
  ////  In this case, there will be two distinct lengths between the mid point, In this case, we want to take
  ////  the coordinates with the shortest distance to the midpoint
  // 2. The squares are offset vertically and horizontally. In this case, there will be 3 or 4 distinct lengths between
  ////  the coordinates, 2 that are the shortest, 4 that are in the middle, and 2 that are the longest. We want
  ////  the middle 4

  if (counts.size === 2) {
    limitedPoints = allPoints.slice(0, 4);
  } else if (counts.size === 3 || counts.size === 4) {
    limitedPoints = allPoints.slice(2, 6);
  } else {
    // if the distance is all the same, the square masks haven't moved, so just return
    return;
  }

  if (limitedPoints.length !== 4) {
    throw new Error("unexpected number of points");
  }

  const limitedPointsSorted = orderBy(limitedPoints, ["corner", "version"]);

  if (counts.size > 2) {
    // for horizontally and vertically shifted, the sort order needs a small hack so the drawing of the
    // rectangle works correctly
    const temp = limitedPointsSorted[2];
    limitedPointsSorted[2] = limitedPointsSorted[3];
    limitedPointsSorted[3] = temp;
  }

  return limitedPointsSorted.map((record) => record.point);
};

type SquareCoordinates2D = [Vector2D, Vector2D, Vector2D, Vector2D];

export const calculateSquareCoordinates = (
  center: Vector2D,
  width: number
): SquareCoordinates2D => {
  // Corners
  // 1 - bottom left
  // 2 - top left
  // 3 - top right
  // 4 - bottom right

  // Note: 0,0 starts in top left. Remember this when doing calculations for corners, the y axis calculations
  // need to be flipped vs bottom left orientation

  const r = width / 2;
  return [
    [center[0] - r, center[1] + r],
    [center[0] - r, center[1] - r],
    [center[0] + r, center[1] - r],
    [center[0] + r, center[1] + r],
  ];
};

export const distanceBetweenPoints = (point1: Vector2D, point2: Vector2D) => {
  return Math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2);
};
