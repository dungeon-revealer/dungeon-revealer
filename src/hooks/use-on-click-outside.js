import { useRef, useEffect } from "react";

// hook for setting up a handler that listens to clicks outside of a given element
// returns a ref that must be passed to the target element
export const useOnClickOutside = (onClickOutside) => {
  const handlerRef = useRef(onClickOutside);
  const elementRef = useRef(null);
  if (onClickOutside !== handlerRef.current) {
    handlerRef.current = onClickOutside;
  }
  useEffect(() => {
    const handleClick = (e) => {
      if (elementRef.current.contains(e.target)) {
        return;
      }
      handlerRef.current(e);
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return elementRef;
};
