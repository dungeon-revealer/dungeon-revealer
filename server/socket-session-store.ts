export type SocketSessionRecord = {
  id: string;
  role: "unauthenticated" | "user" | "admin";
};

export type SocketSessionStore = WeakMap<SocketIO.Socket, SocketSessionRecord>;

export const createSocketSessionStore = (): SocketSessionStore => new WeakMap();
