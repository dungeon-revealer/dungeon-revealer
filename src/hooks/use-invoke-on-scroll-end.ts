import * as React from "react";

/**
 * Hook that returns a function which is intended to be passed to a HTML react component as the onScroll property.
 * The action will be invoked when element has been scrolled to the end.
 */
export const useInvokeOnScrollEnd = (action: () => void) => {
  return React.useCallback(
    ({ currentTarget }: React.UIEvent<HTMLElement>) => {
      const hasReachedBottom =
        currentTarget.scrollHeight - currentTarget.scrollTop ===
        currentTarget.clientHeight;
      if (hasReachedBottom) action();
    },
    [action]
  );
};
