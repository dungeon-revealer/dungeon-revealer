import { useState, useRef, useCallback } from "react";

// check whether all array items are equal
const isEqual = (a, b) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

// returns a stateful value, that reinitializes once the dependencyList changes
export const useResetState = (
  initialValueOrCreateValue,
  dependencyList = []
) => {
  const [, triggerRerender] = useState(initialValueOrCreateValue);
  const stateRef = useRef(null);

  // create initial state
  if (stateRef.current === null) {
    stateRef.current = {
      state:
        typeof initialValueOrCreateValue === "function"
          ? initialValueOrCreateValue()
          : initialValueOrCreateValue,
      deps: dependencyList
    };
  }

  // check if any of the dependencies has changed
  // if so -> recreate state without causing an additonal rerender
  if (!isEqual(stateRef.current.deps, dependencyList)) {
    stateRef.current.state =
      typeof initialValueOrCreateValue === "function"
        ? initialValueOrCreateValue()
        : initialValueOrCreateValue;
    stateRef.current.deps = dependencyList;
  }

  // setState re-implementation that changes the ref and forces a rerender
  const setState = useCallback(
    newState => {
      const oldState = stateRef.current.state;
      if (typeof newState === "function") {
        stateRef.current.state = newState(stateRef.current.state);
      } else {
        stateRef.current.state = newState;
      }
      // do not trigger render in case the state has not changed
      if (oldState === stateRef.current.state) return;
      triggerRerender(i => i + 1);
    },
    [triggerRerender]
  );

  return [stateRef.current.state, setState];
};
