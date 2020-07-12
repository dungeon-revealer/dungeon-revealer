import * as React from "react";
import { createEnvironment } from "./relay-environment";
import { RelayEnvironmentProvider } from "relay-hooks";
import createPersistedState from "use-persisted-state";
import { useStaticRef } from "./hooks/use-static-ref";
import { SplashScreen } from "./splash-screen";
import { ChatToggleButton, IconButton } from "./chat-toggle-button";
import { Chat } from "./chat";
import { DiceRollNotes } from "./chat/dice-roll-notes";
import { useChatSoundsAndUnreadCount } from "./chat/chat";
import { useLogInMutation } from "./chat/log-in-mutation";
import styled from "@emotion/styled/macro";
import { NoteSearch } from "./note-search/note-search";
import {
  TokenInfoAside,
  NoteWindowContextProvider,
} from "./dm-area/token-info-aside";
import * as Icon from "./feather-icons";
import { SoundSettingsProvider } from "./sound-settings";

const useShowChatState = createPersistedState("chat.state");
const useShowDiceRollNotesState = createPersistedState(
  "chat.showDiceRollNotes"
);

const Container = styled.div`
  display: flex;
  height: 100vh;
  position: relative;
  overflow: hidden;
`;

const IconContainer = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  pointer-events: all;
  display: flex;
`;

const AuthenticatedAppShellRenderer: React.FC<{}> = ({ children }) => {
  const [chatState, setShowChatState] = useShowChatState<"show" | "hidden">(
    "hidden"
  );
  const [diceRollNotesState, setDiceRollNotesState] = useShowDiceRollNotesState<
    "show" | "hidden"
  >("hidden");

  const toggleShowDiceRollNotes = React.useCallback(() => {
    setDiceRollNotesState((state) => (state === "show" ? "hidden" : "show"));
  }, []);

  const [hasUnreadMessages, resetUnreadMessages] = useChatSoundsAndUnreadCount(
    chatState
  );

  const [isLoggedIn, logIn] = useLogInMutation();

  React.useEffect(() => {
    logIn();
  }, [logIn]);

  const [showSearch, setShowSearch] = React.useState(false);

  React.useEffect(() => {
    if (!isLoggedIn) return;

    const listener = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.keyCode === 70) {
        ev.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [isLoggedIn]);

  if (isLoggedIn === false) {
    return null;
  }

  return (
    <NoteWindowContextProvider>
      <Container>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {children}
          <IconContainer>
            <IconButton
              onClick={() => setShowSearch(true)}
              style={{ marginRight: 8 }}
            >
              <Icon.SearchIcon height={20} width={20} />
            </IconButton>
            <ChatToggleButton
              hasUnreadMessages={hasUnreadMessages}
              onClick={() => {
                resetUnreadMessages();
                setShowChatState((showChat) =>
                  showChat === "show" ? "hidden" : "show"
                );
              }}
            />
          </IconContainer>
        </div>
        {chatState === "show" ? (
          <div
            style={{
              flex: 1,
              maxWidth: 400,
              borderLeft: "1px solid lightgrey",
            }}
          >
            <Chat toggleShowDiceRollNotes={toggleShowDiceRollNotes} />
          </div>
        ) : null}
        {diceRollNotesState === "show" ? (
          <DiceRollNotes close={toggleShowDiceRollNotes} />
        ) : null}
      </Container>
      <TokenInfoAside />
      {showSearch ? <NoteSearch close={() => setShowSearch(false)} /> : null}
    </NoteWindowContextProvider>
  );
};

type ConnectionMode =
  | "connected"
  | "authenticating"
  | "authenticated"
  | "connecting"
  | "disconnected";

export const AuthenticatedAppShell: React.FC<{
  socket: SocketIOClient.Socket;
  password: string;
}> = ({ socket, password, children }) => {
  const relayEnvironment = useStaticRef(() => createEnvironment(socket));
  // WebSocket connection state
  const [connectionMode, setConnectionMode] = React.useState<ConnectionMode>(
    "connecting"
  );

  /**
   * We only use one tab at a time. The others will be disconnected automatically upon opening dungeon-revealer in another tab.
   * You can still use dungeon-revealer in two tabs by using the incognito mode of the browser.
   * We do this in order to prevent message/user connect/music sound effect spamming.
   */
  React.useEffect(() => {
    socket.on("connect", () => {
      setConnectionMode("connected");
      socket.emit("authenticate", { password: password });
    });

    socket.on("authenticated", () => {
      setConnectionMode("authenticated");
    });

    socket.on("reconnect", () => {
      setConnectionMode("authenticating");
      socket.emit("authenticate", { password: password });
    });

    socket.on("disconnect", () => {
      setConnectionMode("disconnected");
    });

    const tabId = String(
      parseInt(localStorage.getItem("app.tabId") || "0", 10) + 1
    );
    localStorage.setItem("app.tabId", tabId);
    localStorage.setItem("app.activeTabId", tabId);

    window.addEventListener("storage", (ev) => {
      if (ev.key === "app.activeTabId" && ev.newValue !== tabId) {
        socket.disconnect();
      }
    });

    window.addEventListener("focus", () => {
      localStorage.setItem("app.activeTabId", tabId);
      if (!socket.connected) {
        socket.connect();
      }
    });

    return () => {
      socket.off("connect");
      socket.off("reconnecting");
      socket.off("reconnect");
      socket.off("reconnect_failed");
      socket.off("disconnect");
    };
  }, [socket, password]);

  if (connectionMode !== "authenticated") {
    return <SplashScreen text={connectionMode} />;
  }

  return (
    <SoundSettingsProvider>
      <RelayEnvironmentProvider environment={relayEnvironment}>
        <AuthenticatedAppShellRenderer>
          {children}
        </AuthenticatedAppShellRenderer>
      </RelayEnvironmentProvider>
    </SoundSettingsProvider>
  );
};
