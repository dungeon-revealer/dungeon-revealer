import { useRef, useEffect } from "react";

export const useOnKeyDown = (handler) => {
  const ref = useRef();
  ref.current = handler;
  useEffect(() => {
    const onKeyDown = (ev) => {
      ref.current(ev);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
};
