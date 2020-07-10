import * as React from "react";

//
// Hook for mimicking suspense like transition behavior
//
export const useCurrent = <T extends any>(
  data: T | null,
  isLoading: boolean,
  shouldShowLoadingIndicatorThreshold = 300
): [boolean, T | null] => {
  const [, triggerStateUpdate] = React.useState(1);
  const ref = React.useRef({
    data,
    previousIsLoading: isLoading,
    shouldShowLoadingIndicator: isLoading,
  });

  if (!isLoading) {
    ref.current.data = data;
    ref.current.shouldShowLoadingIndicator = false;
  }

  React.useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    if (ref.current.previousIsLoading !== isLoading && isLoading) {
      timeout = setTimeout(() => {
        ref.current.shouldShowLoadingIndicator = true;
        triggerStateUpdate((i) => i + 1);
      }, shouldShowLoadingIndicatorThreshold);
    }

    ref.current.previousIsLoading = isLoading;

    return () => {
      timeout && clearTimeout(timeout);
    };
  }, [isLoading, triggerStateUpdate, shouldShowLoadingIndicatorThreshold]);

  return [ref.current.shouldShowLoadingIndicator, ref.current.data];
};
