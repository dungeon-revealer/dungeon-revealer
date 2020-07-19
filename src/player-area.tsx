import * as React from "react";
import produce from "immer";
import createPersistedState from "use-persisted-state";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import { loadImage } from "./util";
import { Toolbar } from "./toolbar";
import styled from "@emotion/styled/macro";
import * as Icons from "./feather-icons";
import { SplashScreen } from "./splash-screen";
import { AuthenticationScreen } from "./authentication-screen";
import { buildApiUrl } from "./public-url";
import { ImageLightBoxModal } from "./image-lightbox-modal";
import { AuthenticatedAppShell } from "./authenticated-app-shell";
import { useSocket } from "./socket";
import { useStaticRef } from "./hooks/use-static-ref";
import debounce from "lodash/debounce";
import { animated, useSpring, to } from "react-spring";
import { MapView, MapControlInterface } from "./map-view";
import { useGesture } from "react-use-gesture";

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
  const [sharedMediaId, setSharedMediaId] = React.useState<string | null>(null);
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
  const cacheBusterRef = React.useRef(0);

  useAsyncEffect(
    function* (_, cast) {
      const onReceiveMap = async (data: { map: Map }) => {
        if (!data) {
          return;
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
            `/map/${data.map.id}/fog-live?cache_buster=${cacheBusterRef.current}&authorization=${encodeURIComponent(pcPassword)}`
          );
          cacheBusterRef.current = cacheBusterRef.current + 1;

          const task = loadImage(imageUrl);
          pendingFogImageLoad.current = task;

          task.promise.then((fogImage) => {
            const context = fogCanvasRef.current?.getContext("2d");
            if (!context) {
              throw new Error("Invalid state.");
            }
            context.clearRect(
              0,
              0,
              fogImage.naturalWidth,
              fogImage.naturalHeight
            );
            context.drawImage(fogImage, 0, 0);
            mapNeedsUpdateRef.current = true;
          });
          return;
        }

        /**
         * Load new map
         */
        currentMapRef.current = data.map;

        const imageUrl = buildApiUrl(
          // prettier-ignore
          `/map/${data.map.id}/fog-live?cache_buster=${cacheBusterRef.current}&authorization=${encodeURIComponent(pcPassword)}`
        );
        cacheBusterRef.current = cacheBusterRef.current + 1;

        const task = loadImage(imageUrl);
        pendingFogImageLoad.current = task;

        task.promise.then((fogImage) => {
          const canvas = document.createElement("canvas");
          canvas.width = fogImage.naturalWidth;
          canvas.height = fogImage.naturalHeight;
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Invalid state.");
          }
          context.drawImage(fogImage, 0, 0);
          setFogCanvas(canvas);
          setCurrentMap(data.map);
          fogCanvasRef.current = canvas;
          mapNeedsUpdateRef.current = true;
        });
      };

      const result = yield* cast(
        fetch("/active-map").then((res) => res.json())
      );
      const activeMap = result.data.activeMap;

      if (activeMap) {
        yield onReceiveMap({ map: activeMap });
      }

      socket.on("mark area", (data: { id: string; x: number; y: number }) => {
        setMarkedAreas((markedAreas) => [
          ...markedAreas,
          {
            id: data.id,
            x: data.x,
            y: data.y,
          },
        ]);
      });

      socket.on("share image", ({ id }: { id: string }) => {
        setSharedMediaId(id);
      });

      socket.on("map update", onReceiveMap);

      const contextmenuListener = (ev: Event) => {
        ev.preventDefault();
      };
      window.addEventListener("contextmenu", contextmenuListener);

      return () => {
        socket.off("mark area");
        socket.off("map update");

        window.removeEventListener("contextmenu", contextmenuListener);
        if (pendingFogImageLoad.current) {
          pendingFogImageLoad.current.cancel();
          pendingFogImageLoad.current = null;
        }
      };
    },
    [socket, fetch, pcPassword, refetchTrigger]
  );

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
      setRefetchTrigger((i) => i + 1);
    };

    window.addEventListener("focus", listener);
    return () => window.removeEventListener("focus", listener);
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
  }));

  const [showItems, setShowItems] = React.useState(true);

  const isDraggingRef = React.useRef(false);

  const handler = useGesture(
    {
      onDrag: (state) => {
        setToolbarPosition({
          position: state.movement,
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
          right: window.innerWidth - 70 - 10,
          top: 10,
          bottom: window.innerHeight - 50 - 10,
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
      {sharedMediaId ? (
        <ImageLightBoxModal
          src={buildApiUrl(`/images/${sharedMediaId}`)}
          close={() => setSharedMediaId(null)}
        />
      ) : null}
    </>
  );
};

const usePcPassword = createPersistedState("pcPassword");

const AuthenticatedContent: React.FC<{
  pcPassword: string;
  localFetch: typeof fetch;
}> = ({ pcPassword, localFetch }) => {
  const socket = useSocket();

  return (
    <AuthenticatedAppShell password={pcPassword} socket={socket}>
      <PlayerMap fetch={localFetch} pcPassword={pcPassword} socket={socket} />
    </AuthenticatedAppShell>
  );
};

export const PlayerArea: React.FC<{}> = () => {
  const [pcPassword, setPcPassword] = usePcPassword("");

  const [mode, setMode] = React.useState("LOADING");

  const localFetch = React.useCallback(
    (input, init = {}) => {
      return fetch(buildApiUrl(input), {
        ...init,
        headers: {
          Authorization: pcPassword ? `Bearer ${pcPassword}` : undefined,
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
    [pcPassword]
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
      <AuthenticatedContent localFetch={localFetch} pcPassword={pcPassword} />
    );
  }

  throw new Error("Invalid mode.");
};
