import cv from "opencv-ts";
import * as THREE from "three";
import * as React from "react";

export const hexToRGB = (hex: string) => {
  var r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b})`;
};

export const WallsMaker = (props: {
  image: HTMLImageElement | HTMLCanvasElement;
  width: number;
  height: number;
  sfX: number;
  sfY: number;
}) => {
  if (!props.image) {
    return;
  }

  const objects = objectFinder(props.image);

  const sfX = props.image.height / props.height;
  const sfY = props.image.width / props.width;
  if (objects.length <= 0) {
    return undefined;
  }

  var shapeItem = shapesDraw(objects, sfX, sfY) ?? undefined;
  return shapeItem;
};

export const lightDrawer = (
  position: THREE.Vector3,
  color: string,
  intensity: number,
  distance: number
) => {
  return (
    <pointLight
      key={Math.random().toString(36).substr(2, 9)}
      position={position}
      color={color}
      intensity={intensity}
      distance={distance}
      decay={2}
      castShadow={true}
      shadowMapWidth={512}
      shadowMapHeight={512}
      shadowCameraNear={0.01}
      shadowBias={-0.00001}
    />
  );
};

export const objectFinder = (image: HTMLImageElement | HTMLCanvasElement) => {
  let src = cv.imread(image);
  let dst = new cv.Mat();
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.cvtColor(src, src, cv.COLOR_BGR2GRAY, 0);
  cv.threshold(src, dst, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
  cv.findContours(
    src,
    contours,
    hierarchy,
    cv.RETR_LIST,
    cv.CHAIN_APPROX_TC89_KCOS
  );
  let poly = new cv.MatVector();
  for (let i = 0; i < contours.size(); ++i) {
    let tmp = new cv.Mat();
    let cnt = contours.get(i);
    // You can try more different parameters
    cv.approxPolyDP(cnt, tmp, 3, true);
    poly.push_back(tmp);
    cnt.delete();
    tmp.delete();
  }

  const points: Array<Array<Array<number>>> = [];
  for (let i = 0; i < poly.size(); ++i) {
    const ci = poly.get(i);
    points[i] = [];
    for (let j = 0; j < ci.data32S.length; j += 2) {
      let p: Array<number> = [];
      p.push(ci.data32S[j]);
      p.push(ci.data32S[j + 1]);
      points[i].push(p);
    }
  }

  return points;
};

const shapesDraw = (objects: number[][][], sfX: number, sfy: number) => {
  const shapes: Array<THREE.Shape> = [];
  objects.forEach((object) => {
    var shapeArray: Array<THREE.Vector2> = [];
    object.forEach((point) => {
      var vector = new THREE.Vector2();
      var pointS = [point[0] / sfX, -point[1] / sfy];
      vector.fromArray(pointS);
      shapeArray.push(vector);
    });
    var shape = new THREE.Shape(shapeArray);
    shapes.push(shape);
  });
  const extrudeSettings = {
    steps: 1,
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 0,
    bevelOffset: 0,
    bevelSegments: 0,
  };
  // const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );

  const items: Array<React.ReactElement> = [];
  shapes.forEach((shape) => {
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    items.push(
      <mesh
        key={Math.random().toString(36).substr(2, 9)}
        geometry={geometry}
        castShadow={true}
      >
        <meshStandardMaterial
          attach="material"
          color="rgb(0, 0, 0)"
          transparent={true}
          opacity={0.0}
        />
      </mesh>
    );
  });
  return items;
};
