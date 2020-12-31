import * as React from "react";
import { SpringValue } from "react-spring";

/**
 * Takes a HTMLElement reference and returns a SpringValue with its dimensions.
 * Useful for positioning a element according to its dimensions.
 */
export const useAnimatedDimensions = <T extends HTMLElement>(
  ref: React.MutableRefObject<T | null>
): SpringValue<[number, number]> => {
  const [value] = React.useState(
    () => new SpringValue({ from: [0, 0] as [number, number] })
  );

  React.useLayoutEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      value.set([rect.width, rect.height]);
    }
  });

  return value;
};
