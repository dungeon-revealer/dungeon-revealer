import * as t from "io-ts";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

const parseIntegerSafe = (input: string): number | null => {
  const number = parseInt(input, 10);

  if (Number.isNaN(number)) {
    return null;
  }
  return number;
};

/**
 * Convert a number (0, 1) to a boolean and vice versa.
 * Useful if your database has no boolean type.
 */
export const IntegerFromString = new t.Type(
  "IntegerFromString",
  t.number.is,
  (input, context) =>
    pipe(
      t.string.validate(input, context),
      E.map((value) => parseIntegerSafe(value)),
      E.chain((value) =>
        value === null
          ? t.failure(value, context, "Could not parse integer from string.")
          : t.success(value)
      )
    ),
  (value) => String(value)
);
