import * as React from "react";

type TCallback = () => void;
/**
 * Debounce the invocation of a callback (with cleanup).
 */
export const useDebounceCallback = (
  callback: TCallback,
  delay: number
): TCallback => {
  const ref = React.useRef<{
    timer: number | null;
    callback: TCallback;
    delay: number;
  }>({
    timer: null,
    callback,
    delay,
  });

  // update ref data
  React.useEffect(() => {
    ref.current.callback = callback;
    ref.current.delay = delay;
  });

  // cleanup on unmount
  React.useEffect(
    () => () => {
      if (ref.current.timer) {
        clearTimeout(ref.current.timer);
      }
    },
    []
  );

  return React.useCallback(() => {
    if (ref.current.timer) {
      clearTimeout(ref.current.timer);
    }
    ref.current.timer = setTimeout(
      () => ref.current.callback(),
      ref.current.delay
    ) as unknown as number;
  }, []);
};
