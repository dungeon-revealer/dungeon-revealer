import type { RecordProxy } from "relay-runtime";

/**
 * Helper for resolving the wrapped GraphQL type of interfaces and unions
 * see https://github.com/relay-tools/relay-compiler-language-typescript/issues/186
 */
export const isAbstractGraphQLMemberType = <
  T extends { readonly __typename: string },
  A extends Exclude<T["__typename"], "%other">
>(
  input: RecordProxy<T>,
  expectedType: A
): input is RecordProxy<Extract<T, { readonly __typename: A }>> => {
  return input.getValue("__typename") === expectedType;
};
