/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react";

/**
 * ReactDOM and ReactThreeFiber cannot share Contexts :(
 * We need to bridge the context!
 * @source https://github.com/pmndrs/drei/blob/418a9ac0491e72cbfa1076cdd8d4ad483d216f66/src/useContextBridge.tsx#L1-L13
 */
export function useContextBridge(...contexts: Array<React.Context<any>>) {
  const cRef = React.useRef<Array<React.Context<any>>>([]);
  cRef.current = contexts.map((context) => React.useContext(context));
  return React.useMemo(
    () =>
      ({ children }: { children: React.ReactElement<any> }) =>
        contexts.reduceRight(
          (acc, Context, i) => (
            <Context.Provider value={cRef.current[i]} children={acc} />
          ),
          children
        ),
    []
  );
}
