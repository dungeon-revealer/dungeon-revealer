import io from "socket.io-client";
import { useRef, useEffect } from "react";

// hook that creates a websocket instance once
// websocket instance is destroyed upon component unmounting
export const useSocket = () => {
  const ref = useRef(null);
  if (!ref.current) {
    ref.current = io();
  }

  useEffect(
    () => () => {
      if (ref.current) ref.current.close();
    },
    []
  );
  return ref.current;
};
