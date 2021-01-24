export const map = <T, O>(map: (input: T) => Promise<O> | O) =>
  async function* mapGenerator(asyncIterable: AsyncIterableIterator<T>) {
    for await (const value of asyncIterable) {
      yield map(value);
    }
  };

export const filter = <T, U extends T = T>(filter: (input: T) => input is U) =>
  async function* filterGenerator(asyncIterable: AsyncIterableIterator<T>) {
    for await (const value of asyncIterable) {
      if (filter(value)) {
        yield value;
      }
    }
  };
