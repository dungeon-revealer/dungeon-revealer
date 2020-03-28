import { useRef, useCallback, useEffect } from "react";

// longpress hook inspired by https://stackoverflow.com/a/54749871/4202031
// works with touch an mouse events
// the callback function can return a cleanup function which is invoked after the longpress ends
export const useLongPress = (callback = () => {}, ms = 300) => {
  const onReleaseRef = useRef(null);

  const msRef = useRef(ms);
  const callbackRef = useRef(callback);
  const timeoutRef = useRef(null);

  const onMouseDown = useCallback((ev) => {
    if (ev.touches && ev.touches.length === 2) return;
    ev.persist();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onReleaseRef.current = callbackRef.current(ev);
    }, msRef.current);
  }, []);

  useEffect(() => {
    const onUp = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (onReleaseRef.current) {
        onReleaseRef.current();
        onReleaseRef.current = null;
      }
    };

    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onUp);
    window.addEventListener("mouseleave", onUp);
    document.addEventListener("touchmove", onUp);
    document.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onUp);
      window.removeEventListener("mouseleave", onUp);
      document.removeEventListener("touchmove", onUp);
      document.removeEventListener("touchend", onUp);
    };
  }, []);

  useEffect(() => {
    msRef.current = ms;
    callbackRef.current = callback;
  });

  return {
    onMouseDown,
    onTouchStart: onMouseDown,
  };
};
