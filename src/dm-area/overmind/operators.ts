import {
  createOperator,
  IConfiguration,
  Config,
  IContext,
  IOperator,
  Operator
} from "overmind";
import { operatorMatch, OperatorMatcher } from "./dynamic-match";

export const switchMap = <
  Input,
  Output,
  ThisConfig extends IConfiguration = Config
>(
  operation: (context: IContext<ThisConfig>, value: Input) => Promise<Output>
): IOperator<ThisConfig, Input, Output> => {
  let currentId = 0;
  return createOperator(
    "switchMap",
    operation.name || "<unknown>",
    (err, context, value, next, final) => {
      if (err) return next(err, value);
      const localId = (currentId = currentId + 1);
      operation(context as any, value)
        .then(nextValue => {
          if (currentId !== localId) return final(null, value);
          next(null, nextValue);
        })
        .catch(err => {
          next(err, null);
        });
    }
  );
};

export const match = <
  TProperty extends string,
  TMatcher extends OperatorMatcher<TProperty>,
  TPossibleTypes extends string = any,
  TInput extends { [key in TProperty]: TPossibleTypes } = any
>(
  property: TProperty,
  matcher: TMatcher
): Operator<TInput> => {
  return createOperator("match", property, (err, _, value: TInput, next) => {
    if (err) return next(err, value);
    const [newValue, operator] = operatorMatch(property, value, matcher);
    next(null, newValue, {
      path: {
        name: newValue[property],
        operator
      }
    });
  });
};
