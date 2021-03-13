import React from "react";
import { GraphiQL as DefaultGraphiQL } from "graphiql";
import "graphiql/graphiql.css";
import { createSocketIOGraphQLClient } from "@n1ru4l/socket-io-graphql-client";
import { useSocket } from "../socket";
import { buildApiUrl } from "../public-url";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import { RelayEnvironmentProvider } from "relay-hooks";
import { useStaticRef } from "../hooks/use-static-ref";
import { usePersistedState } from "../hooks/use-persisted-state";
import { SplashScreen } from "../splash-screen";
import { AuthenticationScreen } from "../authentication-screen";
import { Socket as IOSocket } from "socket.io-client";
import { createEnvironment } from "../relay-environment";
import { useLogInMutation } from "../chat/log-in-mutation";

const usePcPassword = () =>
  usePersistedState<string>("pcPassword", {
    encode: (value) => JSON.stringify(value),
    decode: (rawValue) => {
      if (typeof rawValue === "string") {
        try {
          const parsedValue = JSON.parse(rawValue);
          if (typeof parsedValue === "string") {
            return parsedValue;
          }
        } catch (e) {}
      }
      return "";
    },
  });

type ConnectionMode =
  | "connected"
  | "authenticating"
  | "authenticated"
  | "connecting"
  | "disconnected";

export type AuthenticatedRole = "DM" | "Player";

const AuthenticatedAppShellRenderer: React.FC = ({ children }) => {
  const [isLoggedIn, logIn] = useLogInMutation();

  React.useEffect(() => {
    logIn();
  }, [logIn]);

  if (isLoggedIn === false) {
    return null;
  }

  return <div>{children}</div>;
};

const AuthenticatedGraphQLShell: React.FC<{
  socket: IOSocket;
  password: string;
  role: AuthenticatedRole;
}> = ({ socket, password, role, children }) => {
  const relayEnvironment = useStaticRef(() => createEnvironment(socket));

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
    <RelayEnvironmentProvider environment={relayEnvironment}>
      <AuthenticatedAppShellRenderer>{children}</AuthenticatedAppShellRenderer>
    </RelayEnvironmentProvider>
  );
};

const AuthenticatedGraphQLContent: React.FC<{
  pcPassword: string;
  localFetch: typeof fetch;
}> = (props) => {
  const socket = useSocket();
  const ioGraphQLClient = createSocketIOGraphQLClient<any>(socket);
  const ioFetcher = (graphQLParams: any) =>
    ioGraphQLClient.execute({
      ...graphQLParams,
      operation: graphQLParams.query,
    });

  const fetcher = ioFetcher;
  return (
    <AuthenticatedGraphQLShell
      password={props.pcPassword}
      socket={socket}
      role="DM"
    >
      <div style={{ height: "100vh" }}>
        <DefaultGraphiQL fetcher={fetcher} />
      </div>
    </AuthenticatedGraphQLShell>
  );
};

export const GraphiQL: React.FC<{
  password: string | null;
}> = (props) => {
  const [pcPassword, setPcPassword] = usePcPassword();
  const initialPcPassword = React.useRef(pcPassword);
  let usedPassword = pcPassword;
  // the password in the query parameters has priority.
  if (pcPassword === initialPcPassword.current && props.password) {
    usedPassword = props.password;
  }

  const [mode, setMode] = React.useState("LOADING");

  const localFetch = React.useCallback(
    (input, init = {}) => {
      return fetch(buildApiUrl(input), {
        ...init,
        headers: {
          Authorization: usedPassword ? `Bearer ${usedPassword}` : undefined,
          ...init.headers,
        },
      }).then((res) => {
        if (res.status === 401) {
          console.error("Unauthenticated access.");
          setMode("AUTHENTICATE");
        }
        return res;
      });
    },
    [usedPassword]
  );

  useAsyncEffect(
    function* () {
      const result: any = yield localFetch("/auth").then((res) => res.json());
      if (!result.data.role) {
        setMode("AUTHENTICATE");
        return;
      }
      setMode("READY");
    },
    [localFetch]
  );

  if (mode === "LOADING") {
    return <SplashScreen text="Loading..." />;
  }

  if (mode === "AUTHENTICATE") {
    return (
      <AuthenticationScreen
        requiredRole="PC"
        fetch={localFetch}
        onAuthenticate={(password) => {
          setPcPassword(password);
        }}
      />
    );
  }

  if (mode === "READY") {
    return (
      <AuthenticatedGraphQLContent
        localFetch={localFetch}
        pcPassword={usedPassword}
      />
    );
  }

  throw new Error("Invalid mode.");
};
