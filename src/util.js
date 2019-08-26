import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Utility for preloading an image as a promise
 */
export const loadImage = src => {
  const image = new Image();

  const cancel = () => {
    image.src = "";
  };

  const promise = new Promise((resolve, reject) => {
    image.src = src;
    const removeEventListeners = () => {
      image.removeEventListener("load", loadListener);
      image.removeEventListener("error", errorListener);
    };
    const loadListener = () => {
      removeEventListeners();
      resolve(image);
    };
    const errorListener = err => {
      removeEventListeners();
      reject(err);
    };
    image.addEventListener("load", loadListener);
    image.addEventListener("error", errorListener);
  });

  return { promise, cancel };
};

/**
 * calculate the optimal dimensions for an area while kepping the aspect ratio
 * @param {number} idealWidth
 * @param {number} idealHeight
 * @param {number} maxWidth
 * @param {number} maxHeight
 */
export const getOptimalDimensions = (
  idealWidth,
  idealHeight,
  maxWidth,
  maxHeight
) => {
  const ratio = Math.min(maxWidth / idealWidth, maxHeight / idealHeight);

  return {
    ratio: ratio,
    width: idealWidth * ratio,
    height: idealHeight * ratio
  };
};

// longpress hook inspired by https://stackoverflow.com/a/54749871/4202031
// works with touch an mouse events
// the callback function can return a cleanup function which is invoked after the longpress ends
export const useLongPress = (callback = () => {}, ms = 300) => {
  const [startLogPress, setStartLongPress] = useState(false);
  const currentEventRef = useRef(null);
  const onReleaseRef = useRef(null);

  useEffect(() => {
    let timerId;
    if (startLogPress) {
      timerId = setTimeout(() => {
        onReleaseRef.current = callback(currentEventRef.current);
        currentEventRef.current = null;
      }, ms);
    } else {
      clearTimeout(timerId);
      currentEventRef.current = null;
    }

    return () => {
      clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startLogPress]);

  const onMouseDown = useCallback(
    ev => {
      ev.persist();
      currentEventRef.current = ev;
      setStartLongPress(true);
    },
    [setStartLongPress]
  );

  const onTouchStart = useCallback(
    ev => {
      ev.persist();
      currentEventRef.current = ev;
      setStartLongPress(true);
    },
    [setStartLongPress]
  );

  useEffect(() => {
    const onUp = () => {
      setStartLongPress(false);
      if (onReleaseRef.current) {
        onReleaseRef.current();
        onReleaseRef.current = null;
      }
    };
    const onMove = () => setStartLongPress(false);
    const onMouseLeave = () => setStartLongPress(false);

    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
  });

  return {
    onMouseDown,
    onTouchStart
  };
};

/**
 * creates a ref that must be mutated but cannot be reassigned.
 */
export const useStaticRef = create => {
  const ref = useRef();
  if (!ref.current) {
    ref.current = create();
  }

  return ref.current;
};

export const ConditionalWrap = ({ condition, wrap, children }) =>
  condition ? wrap(children) : children;
