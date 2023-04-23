import * as React from "react";
import { Socket as IOSocket } from "socket.io-client";
import { createEnvironment } from "./relay-environment";
import { RelayEnvironmentProvider } from "relay-hooks";
import { useStaticRef } from "./hooks/use-static-ref";
import { SplashScreen } from "./splash-screen";
import { ChatToggleButton, IconButton } from "./chat-toggle-button";
import { Chat } from "./chat";
import { SettingsModal } from "./settings-modal/settings-modal";
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
import { animated, useSpring } from "react-spring";
import type { SpringValue } from "react-spring";
import { useWindowDimensions } from "./hooks/use-window-dimensions";
import { SplashShareImage } from "./splash-share-image";
import { usePersistedState } from "./hooks/use-persisted-state";

const useShowChatState = () =>
  usePersistedState<"show" | "hidden">("chat.state", {
    encode: (value) => value,
    decode: (value) => {
      if (
        typeof value !== "string" ||
        ["show", "hidden"].includes(value) === false
      ) {
        return "show";
      }
      return value as "show" | "hidden";
    },
  });

const useShowDiceRollNotesState = () =>
  usePersistedState<"show" | "hidden">("chat.showDiceRollNotes", {
    encode: (value) => value,
    decode: (value) => {
      if (
        typeof value !== "string" ||
        ["show", "hidden"].includes(value) === false
      ) {
        return "hidden";
      }
      return value as "show" | "hidden";
    },
  });

const Container = styled.div`
  display: flex;
  height: 100%;
  position: relative;
  overflow: hidden;
`;

const IconContainer = styled(animated.div)`
  margin-top: 10px;
  margin-right: 10px;
  display: flex;
`;

const Aside = styled.div<{ width: number }>`
  height: 100%;
  width: ${(p) => p.width}px;
  border-left: 1px solid lightgrey;
  pointer-events: all;
  background: #fff;
`;

const CHAT_WIDTH = 400;
const CHAT_BUTTONS_WIDTH = 85;

const useChatWidth = () => {
  const windowDimensions = useWindowDimensions();

  let chatWidth = CHAT_WIDTH;

  if (chatWidth + CHAT_BUTTONS_WIDTH > windowDimensions.width) {
    chatWidth = windowDimensions.width - CHAT_BUTTONS_WIDTH;
  }
  return chatWidth;
};

const AuthenticatedAppShellRenderer: React.FC<{ isMapOnly: boolean }> = ({
  isMapOnly,
  children,
}) => {
  const [chatState, setShowChatState] = useShowChatState();
  const [diceRollNotesState, setDiceRollNotesState] =
    useShowDiceRollNotesState();

  const toggleShowDiceRollNotes = React.useCallback(() => {
    setDiceRollNotesState((state) => (state === "show" ? "hidden" : "show"));
  }, []);

  const [isLoggedIn, logIn] = useLogInMutation();

  const [hasUnreadMessages, resetUnreadMessages] = useChatSoundsAndUnreadCount(
    chatState,
    isLoggedIn
  );

  React.useEffect(() => {
    logIn();
  }, [logIn]);

  const [showSearch, setShowSearch] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

  const role = useViewerRole();

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

  const chatWidth = useChatWidth();

  const chatPosition = useSpring({
    x: chatState === "hidden" ? chatWidth : 0,
  });

  const chatPositionContextValue = React.useMemo(() => {
    return {
      width: chatWidth,
      x: chatPosition.x,
    };
  }, [chatWidth, chatPosition.x]);

  if (isLoggedIn === false) {
    return null;
  }

  return (
    <ChatPositionContext.Provider value={chatPositionContextValue}>
      <NoteWindowContextProvider>
        <Container>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {children}
          </div>
          <SplashShareImage />
          {isMapOnly === false ? (
            <React.Fragment>
              <animated.div
                style={{
                  display: "flex",
                  position: "absolute",
                  right: 0,
                  height: "100%",
                  transform: chatPosition.x.to(
                    (value) => `translateX(${value}px)`
                  ),
                  pointerEvents: "none",
                }}
              >
                <IconContainer>
                  <IconButton
                    onClick={() => setShowSearch(true)}
                    style={{ marginRight: 8, pointerEvents: "all" }}
                  >
                    <Icon.Search boxSize="20px" />
                  </IconButton>
                  {role === "DM" ? (
                    <IconButton
                      onClick={() => setShowSettings(true)}
                      style={{ marginRight: 8, pointerEvents: "all" }}
                    >
                      <Icon.Settings boxSize="20px" />
                    </IconButton>
                  ) : null}
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
                <Aside width={chatWidth}>
                  <Chat toggleShowDiceRollNotes={toggleShowDiceRollNotes} />
                </Aside>
              </animated.div>
            </React.Fragment>
          ) : null}
        </Container>
        {isMapOnly === false ? (
          <React.Fragment>
            <TokenInfoAside />
            {showSearch ? (
              <NoteSearch close={() => setShowSearch(false)} />
            ) : null}
            {diceRollNotesState === "show" ? (
              <React.Suspense fallback={null}>
                <DiceRollNotes close={toggleShowDiceRollNotes} />
              </React.Suspense>
            ) : null}
            {showSettings ? (
              <SettingsModal
                close={() => {
                  setShowSettings(false);
                }}
              ></SettingsModal>
            ) : null}
          </React.Fragment>
        ) : null}
      </NoteWindowContextProvider>
    </ChatPositionContext.Provider>
  );
};

export const ChatPositionContext = React.createContext<{
  width: number;
  x: SpringValue<number>;
} | null>(null);

const DiceRollNotes = React.lazy(() =>
  import("./chat/dice-roll-notes").then((mod) => ({
    default: mod.DiceRollNotes,
  }))
);

type ConnectionMode =
  | "connected"
  | "authenticating"
  | "authenticated"
  | "connecting"
  | "disconnected";

export type AuthenticatedRole = "DM" | "Player";

const RoleContext = React.createContext<AuthenticatedRole>("Player");

export const useViewerRole = (): AuthenticatedRole =>
  React.useContext(RoleContext);

export const AuthenticatedAppShell: React.FC<{
  socket: IOSocket;
  password: string;
  isMapOnly: boolean;
  role: AuthenticatedRole;
}> = ({ socket, password, isMapOnly, role, children }) => {
  const relayEnvironment = useStaticRef(() => createEnvironment(socket));
  // WebSocket connection state
  const [connectionMode, setConnectionMode] =
    React.useState<ConnectionMode>("connecting");

  /**
   * We only use one tab at a time. The others will be disconnected automatically upon opening dungeon-revealer in another tab.
   * You can still use dungeon-revealer in two tabs by using the incognito mode of the browser.
   * We do this in order to prevent message/user connect/music sound effect spamming.
   */
  React.useEffect(() => {
    const authenticate = () => {
      socket.emit("authenticate", {
        password: password,
        desiredRole: role === "DM" ? "admin" : "user",
      });
    };

    socket.on("connect", () => {
      setConnectionMode("connected");
      authenticate();
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

    if (socket.connected) {
      authenticate();
    }

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
    <RoleContext.Provider value={role}>
      <SoundSettingsProvider>
        <RelayEnvironmentProvider environment={relayEnvironment}>
          <AuthenticatedAppShellRenderer isMapOnly={isMapOnly}>
            {children}
          </AuthenticatedAppShellRenderer>
        </RelayEnvironmentProvider>
      </SoundSettingsProvider>
    </RoleContext.Provider>
  );
};
