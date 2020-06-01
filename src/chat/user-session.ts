//
// Utility functions for persisting the user data in the local storage
//
import * as t from "io-ts";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import { flow } from "fp-ts/lib/function";
import { PathReporter } from "io-ts/lib/PathReporter";

const UserRecord = t.type(
  {
    id: t.string,
    name: t.string,
  },
  "UserRecord"
);

type UserRecordType = t.TypeOf<typeof UserRecord>;

const readUserFromLocalStorage = (): E.Either<Error, string | null> =>
  E.tryCatch(() => window.localStorage.getItem("user"), E.toError);

const mapNullUserToError = (input: string | null): E.Either<Error, string> =>
  input === null
    ? E.left(new Error("No user in local storage."))
    : E.right(input);

const formatDecodeError = (errors: t.Errors) => {
  const lines = PathReporter.report(E.left(errors));
  return new Error(
    "Invalid schema. \n" + lines.map((line) => `- ${line}`).join("\n")
  );
};

export const getUser = (): UserRecordType | null =>
  pipe(
    readUserFromLocalStorage(),
    E.chain(mapNullUserToError),
    E.chain((value) => E.parseJSON(value, E.toError)),
    E.chain(flow(UserRecord.decode, E.mapLeft(formatDecodeError))),
    E.fold(
      () => null,
      (value) => value
    )
  );

export const saveUser = (user: UserRecordType) => {
  localStorage.setItem("user", JSON.stringify(user));
};
