import * as React from "react";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import { ReactRelayContext, useMutation, useQuery } from "relay-hooks";
import graphql from "babel-plugin-relay/macro";
import styled from "@emotion/styled/macro";
import { Toolbar } from "./toolbar";
import * as Icon from "./feather-icons";
import { SplashScreen } from "./splash-screen";
import { AuthenticationScreen } from "./authentication-screen";
import { buildApiUrl } from "./public-url";
import { AuthenticatedAppShell } from "./authenticated-app-shell";
import { useSocket } from "./socket";
import { animated, useSpring, to } from "react-spring";
import { MapView, MapControlInterface } from "./map-view";
import { useGesture } from "react-use-gesture";
import { randomHash } from "./utilities/random-hash";
import { useWindowDimensions } from "./hooks/use-window-dimensions";
import { usePersistedState } from "./hooks/use-persisted-state";
import { PlayerMapTool } from "./map-tools/player-map-tool";
import {
  ComponentWithPropsTuple,
  FlatContextProvider,
} from "./flat-context-provider";
import {
  MarkAreaMapTool,
  MarkAreaToolContext,
} from "./map-tools/mark-area-map-tool";
import {
  NoteWindowActionsContext,
  useNoteWindowActions,
} from "./dm-area/token-info-aside";
import { playerArea_PlayerMap_ActiveMapQuery } from "./__generated__/playerArea_PlayerMap_ActiveMapQuery.graphql";
import { playerArea_MapPingMutation } from "./__generated__/playerArea_MapPingMutation.graphql";
import { UpdateTokenContext } from "./update-token-context";
import { LazyLoadedMapView } from "./lazy-loaded-map-view";
import { RulerMapTool } from "./map-tools/ruler-map-tool";
import { DragPanZoomMapTool } from "./map-tools/drag-pan-zoom-map-tool";
import {
  LeftToolbarContainer,
  MenuItemRenderer,
  ToolMapRecord,
} from "./dm-area/dm-map";

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

type MarkedArea = {
  id: string;
  x: number;
  y: number;
};

const createCacheBusterString = () =>
  encodeURIComponent(`${Date.now()}_${randomHash()}`);

const PlayerMap_ActiveMapQuery = graphql`
  query playerArea_PlayerMap_ActiveMapQuery @live {
    activeMap {
      id
      grid {
        offsetX
        offsetY
        columnWidth
        columnHeight
      }
      ...mapView_MapFragment
    }
  }
`;

/*const PlayerMap_MapGridQuery = graphql`
  query playerArea_PlayerMap_MapGridQuery @live {
    activeMap {
      id
      ...mapView_MapFragment
    }
  }
`;*/

const MapPingMutation = graphql`
  mutation playerArea_MapPingMutation($input: MapPingInput!) {
    mapPing(input: $input)
  }
`;

const playerTools: Array<ToolMapRecord> = [
  {
    name: "Move",
    icon: <Icon.Move boxSize="20px" />,
    tool: DragPanZoomMapTool,
    MenuComponent: null,
  },
  {
    name: "Ruler",
    icon: <Icon.Ruler boxSize="20px" />,
    tool: RulerMapTool,
    MenuComponent: null,
  },
  {
    name: "Mark",
    icon: <Icon.Crosshair boxSize="20px" />,
    tool: MarkAreaMapTool,
    MenuComponent: null,
  },
];

const PlayerMap = ({
  fetch,
  socket,
  isMapOnly,
}: {
  fetch: typeof window.fetch;
  socket: ReturnType<typeof useSocket>;
  isMapOnly: boolean;
}) => {
  const currentMap = useQuery<playerArea_PlayerMap_ActiveMapQuery>(
    PlayerMap_ActiveMapQuery
  );
  const [mapPing] = useMutation<playerArea_MapPingMutation>(MapPingMutation);
  // const grid = useQuery<>()

  const mapId = currentMap?.data?.activeMap?.id ?? null;
  const showSplashScreen = mapId === null;

  const controlRef = React.useRef<MapControlInterface | null>(null);
  const [markedAreas, setMarkedAreas] = React.useState<MarkedArea[]>(() => []);

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
    const listener = () => {
      if (document.hidden === false) {
        currentMap.retry();
      }
    };

    window.document.addEventListener("visibilitychange", listener, false);

    return () =>
      window.document.removeEventListener("visibilitychange", listener, false);
  }, []);

  const updateToken = React.useCallback(
    ({ id, ...updates }) => {
      if (currentMap.data?.activeMap) {
        fetch(`/map/${currentMap.data.activeMap.id}/token/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...updates,
            socketId: socket.id,
          }),
        });
      }
    },
    [currentMap, fetch]
  );

  const [toolbarPosition, setToolbarPosition] = useSpring(() => ({
    position: [12, window.innerHeight - 50 - 12] as [number, number],
    snapped: true,
  }));

  const [showItems, setShowItems] = React.useState(true);

  const [activeToolId, setActiveToolId] = React.useState(
    playerTools[0].tool.id
  );

  const userSelectedTool = React.useMemo(() => {
    return (
      playerTools.find((tool) => tool.tool.id === activeToolId) ??
      playerTools[0]
    ).tool;
  }, [activeToolId]);

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
  const noteWindowActions = useNoteWindowActions();
  // const grid = useFragment(ShowGridSettingsPopupGridFragment, props.grid);
  return (
    <>
      <div
        style={{
          cursor: "grab",
          background: "black",
          height: "100vh",
        }}
      >
        <FlatContextProvider
          value={[
            [
              MarkAreaToolContext.Provider,
              {
                value: {
                  onMarkArea: ([x, y]) => {
                    if (currentMap.data?.activeMap) {
                      mapPing({
                        variables: {
                          input: {
                            mapId: currentMap.data.activeMap.id,
                            x,
                            y,
                          },
                        },
                      });
                    }
                  },
                },
              },
            ] as ComponentWithPropsTuple<
              React.ComponentProps<typeof MarkAreaToolContext.Provider>
            >,
            [
              UpdateTokenContext.Provider,
              {
                value: (id, { x, y }) => updateToken({ id, x, y }),
              },
            ] as ComponentWithPropsTuple<
              React.ComponentProps<typeof UpdateTokenContext.Provider>
            >,
          ]}
        >
          {currentMap.data?.activeMap ? (
            <React.Suspense fallback={null}>
              <LazyLoadedMapView
                map={currentMap.data.activeMap}
                grid={currentMap.data.activeMap.grid}
                activeTool={userSelectedTool}
                controlRef={controlRef}
                sharedContexts={[
                  MarkAreaToolContext,
                  NoteWindowActionsContext,
                  ReactRelayContext,
                  UpdateTokenContext,
                ]}
                fogOpacity={1}
              />
            </React.Suspense>
          ) : null}
        </FlatContextProvider>
      </div>
      {!showSplashScreen ? (
        isMapOnly ? null : (
          <>
            <LeftToolbarContainer>
              <Toolbar>
                <Toolbar.Logo />
                <Toolbar.Group divider>
                  {playerTools.map((record) => (
                    <MenuItemRenderer
                      key={record.tool.id}
                      record={record}
                      isActive={record.tool === userSelectedTool}
                      setActiveTool={() => {
                        setActiveToolId(record.tool.id);
                      }}
                    />
                  ))}
                </Toolbar.Group>
              </Toolbar>
            </LeftToolbarContainer>
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
                            controlRef.current?.controls.center();
                          }}
                          onTouchStart={(ev) => {
                            ev.preventDefault();
                            controlRef.current?.controls.center();
                          }}
                        >
                          <Icon.Compass boxSize="20px" />
                          <Icon.Label>Center Map</Icon.Label>
                        </Toolbar.Button>
                      </Toolbar.Item>
                      <Toolbar.Item isActive>
                        <Toolbar.LongPressButton
                          onClick={() => {
                            controlRef.current?.controls.zoomIn();
                          }}
                          onLongPress={() => {
                            const interval = setInterval(() => {
                              controlRef.current?.controls.zoomIn();
                            }, 100);

                            return () => clearInterval(interval);
                          }}
                        >
                          <Icon.ZoomIn boxSize="20px" />
                          <Icon.Label>Zoom In</Icon.Label>
                        </Toolbar.LongPressButton>
                      </Toolbar.Item>
                      <Toolbar.Item isActive>
                        <Toolbar.LongPressButton
                          onClick={() => {
                            controlRef.current?.controls.zoomOut();
                          }}
                          onLongPress={() => {
                            const interval = setInterval(() => {
                              controlRef.current?.controls.zoomOut();
                            }, 100);

                            return () => clearInterval(interval);
                          }}
                        >
                          <Icon.ZoomOut boxSize="20px" />
                          <Icon.Label>Zoom Out</Icon.Label>
                        </Toolbar.LongPressButton>
                      </Toolbar.Item>
                      <Toolbar.Item isActive>
                        <Toolbar.LongPressButton
                          onClick={() => {
                            noteWindowActions.showNoteInWindow(
                              null,
                              "note-editor",
                              true
                            );
                          }}
                        >
                          <Icon.BookOpen boxSize="20px" />
                          <Icon.Label>Notes</Icon.Label>
                        </Toolbar.LongPressButton>
                      </Toolbar.Item>
                    </Toolbar.Group>
                  </React.Fragment>
                ) : null}
              </Toolbar>
            </ToolbarContainer>
          </>
        )
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
        socket={socket}
        isMapOnly={props.isMapOnly}
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
      <AuthenticatedContent
        localFetch={localFetch}
        pcPassword={usedPassword}
        isMapOnly={props.isMapOnly}
      />
    );
  }

  throw new Error("Invalid mode.");
};
