import React from "react";

const MarkdownContext = React.createContext({
  shareImage: (url: string) => {},
});

export const useMarkdownActions = () => React.useContext(MarkdownContext);

export const MarkdownActionsProvider: React.FC<{
  socket: SocketIOClient.Socket;
}> = ({ children, socket }) => {
  const shareImage = React.useCallback(
    (id: string) => {
      socket.emit("share image", { id });
    },
    [socket]
  );
  return React.createElement(MarkdownContext.Provider, {
    children,
    value: {
      shareImage,
    },
  });
};
