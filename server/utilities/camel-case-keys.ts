import { flow } from "fp-ts/lib/function";
import toCamelCase from "lodash/camelCase";
import { AnyDictionaryType, TypeOf } from "io-ts";

export const camelCaseKeys: (
  input: TypeOf<AnyDictionaryType>
) => TypeOf<AnyDictionaryType> = flow(
  Object.entries,
  (entries) => entries.map(([key, value]) => [toCamelCase(key), value]),
  Object.fromEntries
);
