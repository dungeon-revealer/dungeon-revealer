import * as React from "react";

export const useOnClickOutside = <T extends HTMLElement>(
  elementRef: React.MutableRefObject<T | null>,
  onClickOutside: () => void
) => {
  const handlerRef = React.useRef(onClickOutside);
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
};
