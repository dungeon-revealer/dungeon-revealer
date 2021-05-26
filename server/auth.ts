import * as RT from "fp-ts/lib/ReaderTask";
import type { SocketSessionRecord } from "./socket-session-store";
import { pipe } from "fp-ts/lib/function";

export type ViewerRole = "unauthenticated" | "admin" | "user";

export type SessionDependency = { session: SocketSessionRecord };

const isAdmin = (viewerRole: ViewerRole) => viewerRole === "admin";

export const requireAdmin = () =>
  pipe(
    RT.ask<SessionDependency>(),
    RT.chain(
      (d) => () => () =>
        isAdmin(d.session.role)
          ? Promise.resolve(undefined)
          : Promise.reject(new Error("Insufficient permissions."))
    )
  );

export const requireAuth = () =>
  pipe(
    RT.ask<SessionDependency>(),
    RT.chain(
      (d) => () => () =>
        d.session.role === "unauthenticated"
          ? Promise.reject(new Error("Unauthenticated access."))
          : Promise.resolve(undefined)
    )
  );
