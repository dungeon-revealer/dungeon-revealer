import * as React from "react";
import debounce from "lodash/debounce";
import { SpringValue } from "react-spring";

const getDimensions = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

export const useWindowDimensions = () => {
  const [dimensions, setDimensions] = React.useState(getDimensions);

  React.useEffect(() => {
    const listener = debounce(() => {
      setDimensions(getDimensions);
    }, 200);

    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, []);

  return dimensions;
};

export const useAnimatedWindowDimensions = () => {
  const [value] = React.useState(
    () =>
      new SpringValue({
        from: [window.innerWidth, window.innerHeight] as [number, number],
      })
  );

  React.useEffect(() => {
    const listener = debounce(() => {
      value.set([window.innerWidth, window.innerHeight]);
    }, 200);

    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, []);

  return value;
};
