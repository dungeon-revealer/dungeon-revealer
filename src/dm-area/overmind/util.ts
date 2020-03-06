import { ResolveState } from "overmind";

export type Maybe<T = any> = T | null | undefined;
export type Some<T = any> = Exclude<T, null | undefined>;
export type None = null | undefined;

export const isSome = <T = unknown>(input: T): input is Some<T> =>
  input !== null && input !== undefined;

// fixes typings for assignment to the state tree.
// Only call this function on a node when assigning it to the state tree.
export const castTreeNode = <TType extends any>(
  t: TType
): ResolveState<TType> => t as any;
