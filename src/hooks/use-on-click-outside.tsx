import * as React from "react";

export const useOnClickOutside = <T extends HTMLElement>(
  onClickOutside: () => void
) => {
  const handlerRef = React.useRef(onClickOutside);
  const elementRef = React.useRef<T | null>(null);
  if (onClickOutside !== handlerRef.current) {
    handlerRef.current = onClickOutside;
  }
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const { target } = e;
      if (target !== null && target instanceof Node) {
        if (elementRef.current?.contains(target)) {
          return;
        }
        handlerRef.current();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return elementRef;
};
