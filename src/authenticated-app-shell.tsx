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
import { animated, useSpring } from "react-spring";
import { debounce } from "lodash";

const useShowChatState = createPersistedState("chat.state");
const useShowDiceRollNotesState = createPersistedState(
  "chat.showDiceRollNotes"
);

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

const useWindowWidth = () => {
  const [windowWidth, setWindowWidth] = React.useState(window.innerWidth);
  React.useEffect(() => {
    const listener = debounce(() => {
      setWindowWidth(window.innerWidth);
    }, 500);
    window.addEventListener("resize", listener);

    return () => window.removeEventListener("resize", listener);
  });

  return windowWidth;
};

const CHAT_WIDTH = 400;
const CHAT_BUTTONS_WIDTH = 85;

const useChatWidth = () => {
  const windowWidth = useWindowWidth();

  let chatWidth = CHAT_WIDTH;

  if (chatWidth + CHAT_BUTTONS_WIDTH > windowWidth) {
    chatWidth = windowWidth - CHAT_BUTTONS_WIDTH;
  }
  return chatWidth;
};

const AuthenticatedAppShellRenderer: React.FC<{ isMapOnly: boolean }> = ({
  isMapOnly,
  children,
}) => {
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

  const chatWidth = useChatWidth();

  const chatPosition = useSpring({
    x: chatState === "hidden" ? chatWidth : 0,
  });

  if (isLoggedIn === false) {
    return null;
  }

  return (
    <NoteWindowContextProvider>
      <Container>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {children}
        </div>
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
                  <Icon.SearchIcon size={20} />
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
              <div
                style={{
                  height: "100%",
                  width: chatWidth,
                  borderLeft: "1px solid lightgrey",
                  pointerEvents: "all",
                }}
              >
                <Chat toggleShowDiceRollNotes={toggleShowDiceRollNotes} />
              </div>
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
            <DiceRollNotes close={toggleShowDiceRollNotes} />
          ) : null}
        </React.Fragment>
      ) : null}
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
  isMapOnly: boolean;
}> = ({ socket, password, isMapOnly, children }) => {
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
    const authenticate = () => {
      socket.emit("authenticate", { password: password });
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
    <SoundSettingsProvider>
      <RelayEnvironmentProvider environment={relayEnvironment}>
        <AuthenticatedAppShellRenderer isMapOnly={isMapOnly}>
          {children}
        </AuthenticatedAppShellRenderer>
      </RelayEnvironmentProvider>
    </SoundSettingsProvider>
  );
};
