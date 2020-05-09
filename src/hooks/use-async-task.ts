import * as React from "react";
import { useGetIsMounted } from "./use-get-is-mounted";

/**
 * Ensure a async action is only performed once.
 * @param handler
 */
export const useAsyncTask = <
  TArgs extends any[],
  THandler extends (...args: TArgs) => Promise<void>
>(
  handler: THandler
): [boolean, (...args: TArgs) => void] => {
  const [isRunning, setIsRunning] = React.useState(false);
  const getIsMounted = useGetIsMounted();

  const newHandler = React.useCallback(
    (...args: TArgs) => {
      if (isRunning) return;
      setIsRunning(true);
      handler(...args).finally(() => {
        if (getIsMounted()) {
          setIsRunning(false);
        }
      });
    },
    [isRunning, handler, getIsMounted]
  );

  return [isRunning, newHandler];
};
