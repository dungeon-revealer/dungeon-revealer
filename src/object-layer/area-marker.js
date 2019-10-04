import React, { useEffect, useRef } from "react";

/**
 * creates a function that takes the value t which is a number between 0 and 1
 * and maps those to a sin curve in order to produce values resembling a pulsating effect
 * @param {number} duration total duration of the effect in seconds
 * @param {number} interval interval of one pulse animate t from 0 -> 1 -> 0
 * @returns {function(number): number} pulsateFunction
 */
const createPulsateFunction = (duration = 10000, interval = 2000) => {
  const step = duration / interval;
  const modificator = step * 2 * Math.PI;
  return t => 0.5 * Math.sin(t * modificator - Math.PI / 2) + 0.5;
};

const createAnimation = ({ animate, duration, onFinish }) => {
  let id = null;
  let _start = 0;

  const cancel = () => {
    if (id !== null) {
      cancelAnimationFrame(id);
      return;
    }
  };

  const _animate = () => {
    if (id) {
      const t = Math.max(0, Math.min((Date.now() - _start) / duration, 1));
      animate(t);
      if (t >= 1) {
        if (onFinish) {
          onFinish();
        }
        return;
      }
    }
    id = requestAnimationFrame(_animate);
  };

  const start = () => {
    _start = Date.now();
    _animate();
  };

  return { cancel, start };
};

export const AreaMarker = React.memo(({ x, y, onFinishAnimation }) => {
  const circleRef = useRef(null);
  const onFinishAnimationRef = useRef(onFinishAnimation);

  useEffect(() => {
    onFinishAnimationRef.current = onFinishAnimation;
  }, [onFinishAnimation]);

  useEffect(() => {
    const duration = 10500;
    const createValue = createPulsateFunction(duration, 10500 / 10);

    const animation = createAnimation({
      animate: t => {
        circleRef.current.setAttribute("r", 15 + 10 * createValue(t));
        if (t >= 0.9) {
          circleRef.current.setAttribute("opacity", 1 - (t - 0.9) / 0.1);
        }
      },
      duration,
      onFinish: () => {
        onFinishAnimationRef.current();
      }
    });

    animation.start();

    return () => {
      animation.cancel();
    };
  }, []);

  return (
    <circle
      cx={x}
      cy={y}
      r="15"
      strokeWidth="5"
      stroke="red"
      fill="transparent"
      opacity="1"
      ref={circleRef}
    />
  );
});
