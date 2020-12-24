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
    const handleClick = (ev: MouseEvent) => {
      const { target } = ev;
      if (target !== null && target instanceof Node) {
        if (elementRef.current?.contains(target)) {
          return;
        }
        handlerRef.current();
      }
    };

    window.document.addEventListener("mousedown", handleClick);
    return () => window.document.removeEventListener("mousedown", handleClick);
  }, []);

  return elementRef;
};
