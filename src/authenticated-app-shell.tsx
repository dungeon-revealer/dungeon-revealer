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
import { useWindowDimensions } from "./hooks/use-window-dimensions";
import { SplashShareImage } from "./splash-share-image";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import { createSocketIOGraphQLClient } from "@n1ru4l/socket-io-graphql-client";

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

export type AuthenticatedRole = "DM" | "Player";

const RoleContext = React.createContext<AuthenticatedRole>("Player");

export const useViewerRole = (): AuthenticatedRole =>
  React.useContext(RoleContext);

const AsyncLoadedGraphiQL = (props: {
  fetcher: any;
}): React.ReactElement | null => {
  const [Component, setComponent] = React.useState<null | any>(null);

  useAsyncEffect(function* (onCancel, c) {
    const { GraphiQLRoute } = yield* c(import("./graphiql"));
    setComponent(() => GraphiQLRoute);
  }, []);

  if (Component === null) {
    return null;
  }
  return (
    <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0 }}>
      <Component fetcher={props.fetcher} />
    </div>
  );
};

export const AuthenticatedAppShell: React.FC<{
  socket: SocketIOClient.Socket;
  password: string;
  isMapOnly: boolean;
  role: AuthenticatedRole;
}> = ({ socket, password, isMapOnly, role, children }) => {
  const networkInterface = useStaticRef(() =>
    createSocketIOGraphQLClient(socket)
  );
  const relayEnvironment = useStaticRef(() =>
    createEnvironment(networkInterface)
  );
  // WebSocket connection state
  const [connectionMode, setConnectionMode] = React.useState<ConnectionMode>(
    "connecting"
  );
  const [showGraphiQL, setShowGraphiQL] = React.useState(false);

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

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "F12") {
        setShowGraphiQL((state) => !state);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      socket.off("connect");
      socket.off("reconnecting");
      socket.off("reconnect");
      socket.off("reconnect_failed");
      socket.off("disconnect");
      window.removeEventListener("keydown", onKeyDown);
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
          {showGraphiQL ? (
            <AsyncLoadedGraphiQL
              fetcher={({ query: operation, ...execRest }: any) =>
                networkInterface.execute({
                  operation,
                  variables: {},
                  ...execRest,
                })
              }
            />
          ) : null}
        </RelayEnvironmentProvider>
      </SoundSettingsProvider>
    </RoleContext.Provider>
  );
};
