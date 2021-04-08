import { SpringValue, Interpolation } from "@react-spring/core";

export type AnimatableValue<TValue = any> =
  | SpringValue<TValue>
  | Interpolation<any, TValue>;

/**
 * Utility for declaring a value that might be animatable.
 */
export type MaybeAnimatableValue<TValue = any> =
  | AnimatableValue<TValue>
  | TValue;

/**
 * Utility for identifying whether a value is animated or not.
 */
export const isAnimatableValue = <TValue>(
  value: MaybeAnimatableValue<TValue>
): value is AnimatableValue<TValue> =>
  value instanceof SpringValue || value instanceof Interpolation;
