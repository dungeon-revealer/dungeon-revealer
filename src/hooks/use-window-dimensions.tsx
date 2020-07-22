import * as React from "react";
import debounce from "lodash/debounce";

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
