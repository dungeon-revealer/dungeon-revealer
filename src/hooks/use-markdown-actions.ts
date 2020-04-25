import React from "react";
import { useToasts } from "react-toast-notifications";

const MarkdownContext = React.createContext({
  shareImage: (url: string) => {},
});

export const useMarkdownActions = () => React.useContext(MarkdownContext);

export const MarkdownActionsProvider: React.FC<{
  socket: SocketIOClient.Socket;
}> = ({ children, socket }) => {
  const { addToast } = useToasts();
  const shareImage = React.useCallback(
    (id: string) => {
      socket.emit("share image", { id });
      addToast(`Shared Image '${id}' with players.`, {
        appearance: "success",
        autoDismiss: true,
      });
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
