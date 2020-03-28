import { createOperator, Context, Operator, map, pipe } from "overmind";
import { Maybe, None, Some, isSome } from "./util";

export const switchMap = <Input, Output>(
  operation: (context: Context, value: Input) => Promise<Output>
): Operator<Input, Output> => {
  let currentId = 0;
  return createOperator(
    "switchMap",
    operation.name || "<unknown>",
    (err, context, value, next, final) => {
      if (err) return next(err, value);
      const localId = (currentId = currentId + 1);
      operation(context as any, value)
        .then((nextValue) => {
          if (currentId !== localId) return final(null, value);
          next(null, nextValue);
        })
        .catch((err) => {
          if (currentId !== localId) return final(null, value);
          next(err, null);
        });
    }
  );
};

export const operatorMatch = <
  TProperty extends string,
  TPossibleTypes extends string,
  TInput extends { [key in TProperty]: TPossibleTypes },
  TReturnType,
  TMatcher extends {
    [Type in TPossibleTypes]: Operator<
      Extract<TInput, { [key in TProperty]: Type }>,
      TReturnType
    >;
  }
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
    matcher[input[property]],
  ];
};

export const match = <
  TProperty extends string,
  TInput extends { [key in TProperty]: string },
  TPossibleTypes extends string,
  TReturnType
>(
  property: TProperty,
  matcher: {
    [Type in TPossibleTypes]: Operator<
      Extract<TInput, { [key in TProperty]: Type }>,
      TReturnType
    >;
  }
): Operator<TInput, TReturnType> => {
  return createOperator("match", property, (err, _, value: TInput, next) => {
    if (err) return next(err, value);
    const [newValue, operator] = operatorMatch(property, value, matcher as any);
    next(null, newValue, {
      path: {
        name: newValue[property],
        operator,
      },
    });
  });
};

export const matchMode = <
  TInput extends { mode: string },
  TPossibleTypes extends TInput["mode"],
  TReturnType,
  TMatcher extends {
    [TPossibleType in TPossibleTypes]: Operator<
      Extract<TInput, { mode: TPossibleType }>,
      TReturnType
    >;
  }
>(
  matcher: TMatcher
): Operator<TInput, TReturnType> => match("mode", matcher);

//
// Select a subset of value and the actual value
//
export const matchSome = <
  TType,
  TSelectionType extends Maybe,
  TReturn1,
  TReturn2
>(
  selector: (input: TType) => TSelectionType,
  matcher: {
    none: Operator<{ value: TType; selection: None }, TReturn1>;
    some: Operator<{ value: TType; selection: Some<TSelectionType> }, TReturn2>;
  }
): Operator<TType, TReturn1 | TReturn2> => {
  return createOperator("matchSome", "", (err, _, value: TType, next) => {
    if (err) return next(err, value);
    const selection = selector(value);
    if (isSome(selection)) {
      next(
        null,
        { value, selection },
        {
          path: {
            name: "some",
            operator: matcher.some,
          },
        }
      );
    } else {
      next(
        null,
        { value, selection },
        {
          path: {
            name: "none",
            operator: matcher.none,
          },
        }
      );
    }
  });
};
