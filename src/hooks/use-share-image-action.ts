import * as React from "react";
import { useToasts } from "react-toast-notifications";

type ShareImageFunction = (id: string) => void;
const ShareImageContext = React.createContext<ShareImageFunction>(
  () => undefined
);

export const useShareImageAction = () => React.useContext(ShareImageContext);

export const ShareImageActionProvider: React.FC<{
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

  return React.createElement(ShareImageContext.Provider, {
    children,
    value: shareImage,
  });
};
