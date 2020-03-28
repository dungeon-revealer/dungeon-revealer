import React from "react";
import { useSpring, animated } from "react-spring";

export const AreaMarker = React.memo(({ x, y, onFinishAnimation }) => {
  const { radius, opacity } = useSpring({
    from: { radius: 1, opacity: 1 },
    to: { radius: 12 * 15, opacity: 0 },
    config: { duration: 2500 },
    onRest: onFinishAnimation,
  });

  return (
    <animated.circle
      cx={x}
      cy={y}
      r={radius}
      strokeWidth="5"
      stroke="red"
      fill="transparent"
      opacity={opacity}
    />
  );
});
