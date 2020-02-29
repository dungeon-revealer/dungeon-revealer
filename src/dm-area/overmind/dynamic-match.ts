import { Operator } from "overmind";

export type OperatorMatcher<
  TProperty extends string = any,
  TPossibleTypes extends string = any,
  TInput extends { [key in TProperty]: TPossibleTypes } = any
> = {
  [Type in TPossibleTypes]: Operator<
    Extract<TInput, { [key in TProperty]: Type }>,
    any
  >;
};

export const operatorMatch = <
  TProperty extends string,
  TPossibleTypes extends string,
  TInput extends { [key in TProperty]: TPossibleTypes },
  TMatcher extends OperatorMatcher<TProperty, TPossibleTypes, TInput>
>(
  property: TProperty,
  input: TInput,
  matcher: TMatcher
): [
  Extract<TInput, { [key in TProperty]: TInput[TProperty] }>,
  TMatcher[TInput[TProperty]]
] => {
  return [
    input as Extract<TInput, { [key in TProperty]: TInput[TProperty] }>,
    matcher[input[property]]
  ];
};
