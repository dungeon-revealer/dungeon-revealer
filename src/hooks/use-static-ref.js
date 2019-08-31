import { useRef } from "react";

// creates a ref that must be mutated but cannot be reassigned.
export const useStaticRef = create => {
  const ref = useRef();
  if (!ref.current) {
    ref.current = create();
  }

  return ref.current;
};
