import * as React from "react";

export type ComponentWithPropsTuple<TProps = any> = [
  (props: TProps) => React.ReactElement,
  TProps
];

type ArrayOrOne<T> = T | Array<T>;

/**
 * This component allows rendering Components in a flat structure.
 * Some components rely on a lot of differen context providers.
 * Introducing a new level of nesting for each added context changes a lot of formatting of the nested code...
 */
export const FlatContextProvider = (props: {
  value: Array<ComponentWithPropsTuple>;
  children: ArrayOrOne<React.ReactElement | React.ReactNode | null>;
}): React.ReactElement => {
  return props.value
    .slice(0)
    .reverse()
    .reduce(
      (innerNode, [Component, props]) => (
        <Component {...props}>{innerNode}</Component>
      ),
      <>{props.children}</>
    );
};
