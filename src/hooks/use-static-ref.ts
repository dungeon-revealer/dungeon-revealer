import { useRef } from "react";

// creates a ref that must be mutated but cannot be reassigned.
export const useStaticRef = <TRefType extends any>(
  create: () => TRefType
): TRefType => {
  const ref = useRef<TRefType>();
  if (!ref.current) {
    ref.current = create();
  }
  return ref.current;
};
