import { io } from "socket.io-client";
import { useRef, useEffect } from "react";
import { buildApiUrl, getPublicHost } from "./public-url";

// hook that creates a websocket instance once
// websocket instance is destroyed upon component unmounting
export const useSocket = () => {
  const ref = useRef<null | ReturnType<typeof io>>(null);
  if (!ref.current) {
    ref.current = io(getPublicHost(), {
      path: buildApiUrl("/socket.io"),
    });
  }

  useEffect(
    () => () => {
      if (ref.current) ref.current.close();
    },
    []
  );
  return ref.current;
};
