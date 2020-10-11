import * as RE from "fp-ts/lib/ReaderEither";
import * as R from "fp-ts/lib/Reader";

import * as E from "fp-ts/lib/Either";

import type { SocketSessionRecord } from "./socket-session-store";

type ViewerRole = "unauthenticated" | "admin" | "user";

export const isAdmin = (viewerRole: ViewerRole) => viewerRole === "admin";

export const askSession = () => R.ask<{ session: SocketSessionRecord }>();

export const checkAdmin = <T>(
  input: T
): RE.ReaderEither<{ session: SocketSessionRecord }, Error, T> => (deps) =>
  isAdmin(deps.session.role)
    ? E.right(input)
    : E.left(new Error("Insufficient permissions."));
