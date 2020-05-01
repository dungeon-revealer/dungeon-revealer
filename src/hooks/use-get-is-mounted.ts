import * as React from "react";

/**
 * Hook for checking whether the component has unmounted.
 * Useful for not setting state after unmount.
 */
export const useGetIsMounted = () => {
  const ref = React.useRef<boolean>(true);
  React.useEffect(
    () => () => {
      ref.current = false;
    },
    []
  );
  return React.useCallback(() => ref.current, []);
};
