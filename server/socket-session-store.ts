import type { Socket as IOSocket } from "socket.io";

export type SocketSessionRecord = {
  id: string;
  role: "unauthenticated" | "user" | "admin";
};

export type SocketSessionStore = WeakMap<IOSocket, SocketSessionRecord>;

export const createSocketSessionStore = (): SocketSessionStore => new WeakMap();
