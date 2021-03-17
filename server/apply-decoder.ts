import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import * as E from "fp-ts/lib/Either";
import * as RT from "fp-ts/lib/ReaderTask";
import { flow } from "fp-ts/lib/function";

export const applyDecoder = <D, T extends t.Type<any, any, any>>(
  type: T
): ((input: unknown) => RT.ReaderTask<D, t.TypeOf<T>>) =>
  flow(
    type.decode,
    E.mapLeft((errors: t.Errors) => {
      const lines = PathReporter.report(E.left(errors));
      return new Error(
        "Invalid schema. \n" + lines.map((line) => `- ${line}`).join("\n")
      );
    }),
    (either) => {
      if (E.isLeft(either)) {
        return RT.fromTask(() => Promise.reject(either.left));
      }
      return RT.fromTask(() => Promise.resolve(either.right));
    }
  );
