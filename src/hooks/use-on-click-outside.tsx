import * as React from "react";

const getRadixContainers = () =>
  Array.from(window.document.querySelectorAll("[data-radix-portal]"));

const parentIsRadixPortal = (target: Node) =>
  getRadixContainers().some((element) => element.contains(target));

export const useOnClickOutside = <T extends HTMLElement>(
  elementRef: React.MutableRefObject<T | null>,
  onClickOutside: () => void
) => {
  const handlerRef = React.useRef(onClickOutside);
  React.useEffect(() => {
    handlerRef.current = onClickOutside;
  });
  React.useEffect(() => {
    const handleClick = (ev: MouseEvent) => {
      const { target } = ev;
      if (target !== null && target instanceof Node) {
        if (
          elementRef.current?.contains(target) ||
          parentIsRadixPortal(target)
        ) {
          return;
        }
        handlerRef.current();
      }
    };

    window.document.addEventListener("mousedown", handleClick);
    return () => window.document.removeEventListener("mousedown", handleClick);
  }, []);
};
