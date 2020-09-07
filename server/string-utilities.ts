import * as O from "fp-ts/lib/Option";

export const split1 = (delimiter: string) => (
  input: string
): O.Option<[string, string]> => {
  const index = input.indexOf(delimiter);
  if (index === -1) {
    return O.none;
  }

  return O.some([input.substring(0, index), input.substring(index + 1)]);
};
