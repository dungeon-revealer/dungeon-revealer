import { isAsyncIterable } from "@n1ru4l/push-pull-async-iterable-iterator";

/**
 * map the events published by a AsyncIterableIterator
 */
export const map = <T, O>(map: (input: T) => Promise<O> | O) =>
  async function* mapGenerator(asyncIterable: AsyncIterableIterator<T>) {
    for await (const value of asyncIterable) {
      yield map(value);
    }
  };

/**
 * filter the events published by a AsyncIterableIterator
 */
export function filter<T, U extends T>(
  filter: (input: T) => input is U
): (
  asyncIterable: AsyncIterableIterator<T>
) => AsyncGenerator<U, void, unknown>;
export function filter<T>(
  filter: (input: T) => boolean
): (
  asyncIterable: AsyncIterableIterator<T>
) => AsyncGenerator<T, void, unknown>;
export function filter(filter: (value: unknown) => boolean) {
  return async function* filterGenerator(
    asyncIterable: AsyncIterableIterator<unknown>
  ) {
    for await (const value of asyncIterable) {
      if (filter(value)) {
        yield value;
      }
    }
  };
}

type MaybePromise<T> = T | Promise<T>;

export async function* from<T>(
  input: MaybePromise<AsyncIterableIterator<T> | T>
): AsyncIterableIterator<T> {
  const value = await input;
  if (isAsyncIterable(value)) {
    for await (const part of value) {
      yield part;
    }
  } else {
    yield value;
  }
}
