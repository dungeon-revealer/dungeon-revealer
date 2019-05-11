import { useState, useEffect, useRef } from "react";

/**
 * Utility for preloading an image as a promise
 */
export const loadImage = src => {
  return new Promise((resolve, reject) => {
    const image = new Image();
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
};

/**
 * longpress hook inspired by https://stackoverflow.com/a/54749871/4202031
 * works with touch an mouse events
 */
export const useLongPress = (callback = () => {}, ms = 300) => {
  const [startLogPress, setStartLongPress] = useState(false);
  const currentEventRef = useRef(null);

  useEffect(() => {
    let timerId;
    if (startLogPress) {
      timerId = setTimeout(() => {
        callback(currentEventRef.current);
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

  return {
    onMouseDown: ev => {
      ev.persist();
      currentEventRef.current = ev;
      setStartLongPress(true);
    },
    onMouseUp: () => setStartLongPress(false),
    onMouseMove: () => setStartLongPress(false),
    onTouchMove: ev => {
      setStartLongPress(false);
    },
    onMouseLeave: () => setStartLongPress(false),
    onTouchStart: ev => {
      ev.preventDefault();
      ev.persist();
      currentEventRef.current = ev;
      setStartLongPress(true);
    },
    onTouchEnd: () => setStartLongPress(false)
  };
};
