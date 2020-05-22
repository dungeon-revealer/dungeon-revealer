import uniqueId from "lodash/uniqueId";
import { useRef } from "react";

// hook that returns a unique id which stays the same as long as the in which the hook is used does not unmount
export const useUniqueId = () => {
  const ref = useRef<string>();
  if (!ref.current) {
    ref.current = uniqueId();
  }
  return ref.current;
};
