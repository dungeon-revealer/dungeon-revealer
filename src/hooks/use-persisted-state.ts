import * as React from "react";

export type PersistedStateModel<T = unknown> = {
  encode: (input: T) => string;
  decode: (input: unknown) => T;
};

export const usePersistedState = <T = unknown>(
  name: string,
  model: PersistedStateModel<T>
) => {
  const [value, setValue] = React.useState(() => {
    const rawValue = window.localStorage.getItem(name);
    return model.decode(rawValue);
  });

  const isFirstRunRef = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRunRef.current === true) {
      isFirstRunRef.current = false;
      return;
    }
    window.localStorage.setItem(name, model.encode(value));
  }, [value]);

  return [value, setValue] as const;
};
