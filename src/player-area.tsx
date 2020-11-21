import * as React from "react";
import produce from "immer";
import once from "lodash/once";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import { loadImage, getOptimalDimensions } from "./util";
import { Toolbar } from "./toolbar";
import styled from "@emotion/styled/macro";
import * as Icons from "./feather-icons";
import { SplashScreen } from "./splash-screen";
import { AuthenticationScreen } from "./authentication-screen";
import { buildApiUrl } from "./public-url";
import { AuthenticatedAppShell } from "./authenticated-app-shell";
import { useSocket } from "./socket";
import { useStaticRef } from "./hooks/use-static-ref";
import debounce from "lodash/debounce";
import { animated, useSpring, to } from "react-spring";
import { MapView, MapControlInterface } from "./map-view";
import { useGesture } from "react-use-gesture";
import { ToastProvider } from "react-toast-notifications";
import { v4 as uuid } from "uuid";
import { useWindowDimensions } from "./hooks/use-window-dimensions";
import { usePersistedState } from "./hooks/use-persisted-state";

const ToolbarContainer = styled(animated.div)`
  position: absolute;
  display: flex;
  justify-content: center;
  pointer-events: none;
  user-select: none;
  top: 0;
  left: 0;
`;

const AbsoluteFullscreenContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

type Grid = {
  x: number;
  y: number;
  sideLength: number;
};

type Token = {
  id: string;
  radius: number;
  color: string;
  label: string;
  x: number;
  y: number;
  isVisibleForPlayers: boolean;
  isMovableByPlayers: boolean;
  isLocked: boolean;
};

type Map = {
  id: string;
  showGridToPlayers: boolean;
  grid: null | Grid;
  gridColor: string;
  tokens: Token[];
};

type MarkedArea = {
  id: string;
  x: number;
  y: number;
};

const createCacheBusterString = () =>
  encodeURIComponent(`${Date.now()}_${uuid()}`);

const getWebGLMaximumTextureSize = once(() => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl");
  if (!context) {
    throw new Error("Invalid state.");
  }
  return context.getParameter(context.MAX_TEXTURE_SIZE);
});

const isFirefoxOnWindows = () =>
  window.navigator.userAgent.toLowerCase().includes("firefox") &&
  window.navigator.platform.toLowerCase().startsWith("win");

const PlayerMap: React.FC<{
  fetch: typeof fetch;
  pcPassword: string;
  socket: ReturnType<typeof useSocket>;
}> = ({ fetch, pcPassword, socket }) => {
  const [currentMap, setCurrentMap] = React.useState<null | Map>(null);
  const currentMapRef = React.useRef(currentMap);
  const [fogCanvas, setFogCanvas] = React.useState<null | HTMLCanvasElement>(
    null
  );
  const fogCanvasRef = React.useRef(fogCanvas);
  const mapNeedsUpdateRef = React.useRef(false);

  const mapId = currentMap ? currentMap.id : null;
  const showSplashScreen = mapId === null;

  const controlRef = React.useRef<MapControlInterface | null>(null);
  /**
   * used for canceling pending requests in case there is a new update incoming.
   * should be either null or an array of tasks returned by loadImage
   */
  const pendingFogImageLoad = React.useRef<ReturnType<typeof loadImage> | null>(
    null
  );
  const [markedAreas, setMarkedAreas] = React.useState<MarkedArea[]>(() => []);

  const [refetchTrigger, setRefetchTrigger] = React.useState(0);

  const onReceiveMap = React.useCallback((data: { map: Map }) => {
    if (!data) {
      return;
    }
    if (window.document.visibilityState === "hidden") {
      return;
    }

    if (pendingFogImageLoad.current) {
      pendingFogImageLoad.current.cancel();
      pendingFogImageLoad.current = null;
    }

    /**
     * Hide map (show splashscreen)
     */
    if (!data.map) {
      currentMapRef.current = null;
      setCurrentMap(null);
      setFogCanvas(null);
      return;
    }
    /**
     * Fog has updated
     */
    if (currentMapRef.current && currentMapRef.current.id === data.map.id) {
      const imageUrl = buildApiUrl(
        // prettier-ignore
        `/map/${data.map.id}/fog-live?cache_buster=${createCacheBusterString()}&authorization=${encodeURIComponent(pcPassword)}`
      );

      const task = loadImage(imageUrl);
      pendingFogImageLoad.current = task;

      task.promise
        .then((fogImage) => {
          const context = fogCanvasRef.current?.getContext("2d");
          if (!context || !fogCanvasRef.current) {
            throw new Error("Invalid state.");
          }
          context.clearRect(
            0,
            0,
            fogCanvasRef.current.width,
            fogCanvasRef.current.height
          );

          context.drawImage(
            fogImage,
            0,
            0,
            fogCanvasRef.current.width,
            fogCanvasRef.current.height
          );
          mapNeedsUpdateRef.current = true;
        })
        .catch((err) => {
          console.log("Cancel loading image.");
        });
      return;
    }

    /**
     * Load new map
     */
    currentMapRef.current = data.map;

    const imageUrl = buildApiUrl(
      // prettier-ignore
      `/map/${data.map.id}/fog-live?cache_buster=${createCacheBusterString()}&authorization=${encodeURIComponent(pcPassword)}`
    );

    const task = loadImage(imageUrl);
    pendingFogImageLoad.current = task;

    task.promise
      .then((fogImage) => {
        const canvas = window.document.createElement("canvas");

        // For some reason the fog is not rendered on Safari for bigger maps (despite being downsized)
        // However, if down-scaled before being passed to the texture loader everything seems to be fine.
        const maximumTextureSize = getWebGLMaximumTextureSize();
        const { width, height } = getOptimalDimensions(
          fogImage.naturalWidth,
          fogImage.naturalHeight,
          maximumTextureSize,
          maximumTextureSize
        );

        const isMaximum =
          maximumTextureSize === width || maximumTextureSize === height;

        canvas.width =
          isFirefoxOnWindows() && isMaximum ? Math.floor(width * 0.7) : width;
        canvas.height =
          isFirefoxOnWindows() && isMaximum ? Math.floor(height * 0.7) : height;

        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Invalid state.");
        }
        context.drawImage(fogImage, 0, 0, width, height);
        setFogCanvas(canvas);
        setCurrentMap(data.map);
        fogCanvasRef.current = canvas;
        mapNeedsUpdateRef.current = true;
      })
      .catch((err) => {
        console.log("Cancel loading image.");
      });
  }, []);

  useAsyncEffect(
    function* (_, cast) {
      const result = yield* cast(
        fetch("/active-map").then((res) => res.json())
      );
      const activeMap = result.data.activeMap;

      if (activeMap) {
        onReceiveMap({ map: activeMap });
      }

      return () => {
        if (pendingFogImageLoad.current) {
          pendingFogImageLoad.current.cancel();
          pendingFogImageLoad.current = null;
        }
      };
    },
    [socket, pcPassword, refetchTrigger]
  );

  React.useEffect(() => {
    socket.on("map update", onReceiveMap);
    socket.on("mark area", (data: { id: string; x: number; y: number }) => {
      if (window.document.visibilityState === "hidden") {
        return;
      }
      setMarkedAreas((markedAreas) => [
        ...markedAreas,
        {
          id: data.id,
          x: data.x,
          y: data.y,
        },
      ]);
    });
    return () => {
      socket.off("map update");
      socket.off("mark area");
    };
  }, [socket]);

  React.useEffect(() => {
    const contextmenuListener = (ev: Event) => {
      ev.preventDefault();
    };
    return () => {
      window.addEventListener("contextmenu", contextmenuListener);
      window.removeEventListener("contextmenu", contextmenuListener);
    };
  }, []);

  React.useEffect(() => {
    if (!mapId) return;
    const eventName = `token:mapId:${mapId}`;

    socket.on(eventName, ({ type, data }: { type: string; data: any }) => {
      if (type === "add") {
        setCurrentMap(
          produce((map) => {
            map.tokens.push(data.token);
          })
        );
      } else if (type === "update") {
        setCurrentMap(
          produce((map: Map | null) => {
            if (map) {
              map.tokens = map.tokens.map((token) => {
                if (token.id !== data.token.id) return token;
                return {
                  ...token,
                  ...data.token,
                };
              });
            }
          })
        );
      } else if (type === "remove") {
        setCurrentMap(
          produce((map: Map | null) => {
            if (map) {
              map.tokens = map.tokens = map.tokens.filter(
                (token) => token.id !== data.tokenId
              );
            }
          })
        );
      }
    });

    return () => {
      socket.off(eventName);
    };
  }, [socket, mapId]);

  React.useEffect(() => {
    const listener = () => {
      if (document.hidden === false) {
        setRefetchTrigger((i) => i + 1);
      }
    };

    window.document.addEventListener("visibilitychange", listener, false);

    return () =>
      window.document.removeEventListener("visibilitychange", listener, false);
  }, []);

  const persistTokenChanges = useStaticRef(() =>
    debounce(
      (
        loadedMapId: string,
        id: string,
        updates: any,
        localFetch: typeof fetch
      ) => {
        localFetch(`/map/${loadedMapId}/token/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...updates,
          }),
        });
      },
      100
    )
  );

  const updateToken = React.useCallback(
    ({ id, ...updates }) => {
      setCurrentMap(
        produce((map: Map | null) => {
          if (map) {
            map.tokens = map.tokens.map((token) => {
              if (token.id !== id) return token;
              return { ...token, ...updates };
            });
          }
        })
      );

      if (currentMap) {
        persistTokenChanges(currentMap.id, id, updates, fetch);
      }
    },
    [currentMap, persistTokenChanges, fetch]
  );

  const [toolbarPosition, setToolbarPosition] = useSpring(() => ({
    position: [12, window.innerHeight - 50 - 12] as [number, number],
    snapped: true,
  }));

  const [showItems, setShowItems] = React.useState(true);

  const isDraggingRef = React.useRef(false);

  const windowDimensions = useWindowDimensions();

  React.useEffect(() => {
    const position = toolbarPosition.position.get();
    const snapped = toolbarPosition.snapped.get();
    const y = position[1] + 50 + 12;
    if (y > windowDimensions.height || snapped) {
      setToolbarPosition({
        position: [position[0], windowDimensions.height - 50 - 12],
        snapped: true,
      });
    }
  }, [windowDimensions]);

  const handler = useGesture(
    {
      onDrag: (state) => {
        setToolbarPosition({
          position: state.movement,
          snapped: state.movement[1] === windowDimensions.height - 50 - 10,
          immediate: true,
        });
      },
      onClick: () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          return;
        }
        setShowItems((showItems) => !showItems);
      },
    },
    {
      drag: {
        initial: () => toolbarPosition.position.get(),
        bounds: {
          left: 10,
          right: windowDimensions.width - 70 - 10,
          top: 10,
          bottom: windowDimensions.height - 50 - 10,
        },
        threshold: 5,
      },
    }
  );

  return (
    <>
      <div
        style={{
          cursor: "grab",
          background: "black",
          height: "100vh",
        }}
      >
        <React.Suspense fallback={null}>
          {currentMap && fogCanvas ? (
            <MapView
              mapImageUrl={buildApiUrl(
                `/map/${currentMap.id}/map?authorization=${encodeURIComponent(
                  pcPassword
                )}`
              )}
              fogCanvas={fogCanvas}
              controlRef={controlRef}
              tokens={currentMap.tokens}
              updateTokenPosition={(id, position) =>
                updateToken({ id, ...position })
              }
              markedAreas={markedAreas}
              markArea={({ x, y }) => {
                socket.emit("mark area", { x, y });
              }}
              removeMarkedArea={(id) => {
                setMarkedAreas((markedAreas) =>
                  markedAreas.filter((area) => area.id !== id)
                );
              }}
              mapTextureNeedsUpdateRef={mapNeedsUpdateRef}
              grid={
                currentMap.grid && currentMap.showGridToPlayers
                  ? {
                      x: currentMap.grid.x,
                      y: currentMap.grid.y,
                      sideLength: currentMap.grid.sideLength,
                      color: currentMap.gridColor || "red",
                    }
                  : null
              }
            />
          ) : null}
        </React.Suspense>
      </div>
      {!showSplashScreen ? (
        <ToolbarContainer
          style={{
            transform: to(
              [toolbarPosition.position],
              ([x, y]) => `translate(${x}px, ${y}px)`
            ),
          }}
        >
          <Toolbar horizontal>
            <Toolbar.Logo {...handler()} cursor="grab" />
            {showItems ? (
              <React.Fragment>
                <Toolbar.Group>
                  <Toolbar.Item isActive>
                    <Toolbar.Button
                      onClick={() => {
                        controlRef.current?.center();
                      }}
                      onTouchStart={(ev) => {
                        ev.preventDefault();
                        controlRef.current?.center();
                      }}
                    >
                      <Icons.Compass size={20} />
                      <Icons.Label>Center Map</Icons.Label>
                    </Toolbar.Button>
                  </Toolbar.Item>
                  <Toolbar.Item isActive>
                    <Toolbar.LongPressButton
                      onClick={() => {
                        controlRef.current?.zoomIn();
                      }}
                      onLongPress={() => {
                        const interval = setInterval(() => {
                          controlRef.current?.zoomIn();
                        }, 100);

                        return () => clearInterval(interval);
                      }}
                    >
                      <Icons.ZoomIn size={20} />
                      <Icons.Label>Zoom In</Icons.Label>
                    </Toolbar.LongPressButton>
                  </Toolbar.Item>
                  <Toolbar.Item isActive>
                    <Toolbar.LongPressButton
                      onClick={() => {
                        controlRef.current?.zoomOut();
                      }}
                      onLongPress={() => {
                        const interval = setInterval(() => {
                          controlRef.current?.zoomOut();
                        }, 100);

                        return () => clearInterval(interval);
                      }}
                    >
                      <Icons.ZoomOut size={20} />
                      <Icons.Label>Zoom Out</Icons.Label>
                    </Toolbar.LongPressButton>
                  </Toolbar.Item>
                </Toolbar.Group>
              </React.Fragment>
            ) : null}
          </Toolbar>
        </ToolbarContainer>
      ) : (
        <AbsoluteFullscreenContainer>
          <SplashScreen text="Ready." />
        </AbsoluteFullscreenContainer>
      )}
    </>
  );
};

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

const AuthenticatedContent: React.FC<{
  pcPassword: string;
  localFetch: typeof fetch;
  isMapOnly: boolean;
}> = (props) => {
  const socket = useSocket();

  return (
    <AuthenticatedAppShell
      password={props.pcPassword}
      socket={socket}
      isMapOnly={props.isMapOnly}
      role="Player"
    >
      <PlayerMap
        fetch={props.localFetch}
        pcPassword={props.pcPassword}
        socket={socket}
      />
    </AuthenticatedAppShell>
  );
};

export const PlayerArea: React.FC<{
  password: string | null;
  isMapOnly: boolean;
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
      <ToastProvider placement="bottom-right">
        <AuthenticatedContent
          localFetch={localFetch}
          pcPassword={usedPassword}
          isMapOnly={props.isMapOnly}
        />
      </ToastProvider>
    );
  }

  throw new Error("Invalid mode.");
};
