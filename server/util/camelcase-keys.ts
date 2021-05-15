import { flow } from "fp-ts/lib/function";
import toCamelCase from "lodash/camelCase";

/**
 * Converts all objects keys to camel-case (only top level).
 */
export const camelCaseKeys: (obj: { [key: string]: unknown }) => {
  [key: string]: unknown;
} = flow(
  Object.entries,
  (entries) => entries.map(([key, value]) => [toCamelCase(key), value]),
  Object.fromEntries
);
