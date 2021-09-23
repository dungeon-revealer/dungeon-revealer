import "./offscreen-canvas-polyfill";
import * as React from "react";
import produce from "immer";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import styled from "@emotion/styled/macro";
import { Box, Center } from "@chakra-ui/react";
import { commitMutation } from "relay-runtime";
import { useQuery, useRelayEnvironment } from "relay-hooks";
import graphql from "babel-plugin-relay/macro";
import { SelectMapModal } from "./select-map-modal";
import { ImportFileModal } from "./import-file-modal";
import { MediaLibrary } from "./media-library";
import { useSocket } from "../socket";
import { buildApiUrl } from "../public-url";
import { AuthenticationScreen } from "../authentication-screen";
import { SplashScreen } from "../splash-screen";
import { FetchContext } from "./fetch-context";
import { ISendRequestTask, sendRequest } from "../http-request";
import { AuthenticatedAppShell } from "../authenticated-app-shell";
import { AccessTokenProvider } from "../hooks/use-access-token";
import { usePersistedState } from "../hooks/use-persisted-state";
import { DmMap } from "./dm-map";
import { Socket } from "socket.io-client";
import { MapEntity, MapTokenEntity, MarkedAreaEntity } from "../map-typings";
import { isFileDrag } from "../hooks/use-drop-zone";
import { useNoteWindowActions } from "./token-info-aside";
import { MapControlInterface } from "../map-view";
import { useTokenImageUpload } from "./token-image-upload";
import { dmAreaTokenAddManyMutation } from "./__generated__/dmAreaTokenAddManyMutation.graphql";
import { dmArea_ActiveMapQuery } from "./__generated__/dmArea_ActiveMapQuery.graphql";

const useLoadedMapId = () =>
  usePersistedState<string | null>("loadedMapId", {
    encode: (value) => JSON.stringify(value),
    decode: (rawValue) => {
      if (typeof rawValue === "string") {
        try {
          const parsedValue = JSON.parse(rawValue);
          if (typeof parsedValue === "string") {
            return parsedValue;
          }
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }

      return null;
    },
  });

const useDmPassword = () =>
  usePersistedState<string>("dmPassword", {
    encode: (value) => JSON.stringify(value),
    decode: (value) => {
      try {
        if (typeof value === "string") {
          const parsedValue = JSON.parse(value);
          if (typeof parsedValue === "string") {
            return parsedValue;
          }
        }
        // eslint-disable-next-line no-empty
      } catch (e) {}
      return "";
    },
  });

type Mode =
  | {
      title: "LOADING";
      data: null;
    }
  | {
      title: "SHOW_MAP_LIBRARY";
    }
  | {
      title: "EDIT_MAP";
    }
  | {
      title: "MEDIA_LIBRARY";
    };

const createInitialMode = (): Mode => ({
  title: "LOADING",
  data: null,
});

type MapData = {
  currentMapId: null | string;
  maps: Array<MapEntity>;
};

type SocketTokenEvent =
  | {
      type: "add";
      data: {
        tokens: Array<MapTokenEntity>;
      };
    }
  | {
      type: "update";
      data: {
        tokens: Array<MapTokenEntity>;
      };
    }
  | {
      type: "remove";
      data: {
        tokenIds: Array<string>;
      };
    };

type TokenPartial = Omit<Partial<MapTokenEntity>, "id">;

const LoadedMapDiv = styled.div`
  display: flex;
  height: 100vh;
  /* Mobile Chrome 100vh issue with address bar */
  @media screen and (max-width: 580px) and (-webkit-min-device-pixel-ratio: 0) {
    height: calc(100vh - 56px);
  }
`;

const DmAreaTokenAddManyMutation = graphql`
  mutation dmAreaTokenAddManyMutation($input: MapTokenAddManyInput!) {
    mapTokenAddMany(input: $input)
  }
`;

const DmArea_ActiveMapQuery = graphql`
  query dmArea_ActiveMapQuery @live {
    activeMap {
      id
    }
  }
`;

const Content = ({
  socket,
  password: dmPassword,
}: {
  socket: Socket;
  password: string;
}): React.ReactElement => {
  const activeMapResponse = useQuery<dmArea_ActiveMapQuery>(
    DmArea_ActiveMapQuery
  );
  const [loadedMapId, setLoadedMapId] = useLoadedMapId();
  // EDIT_MAP, SHOW_MAP_LIBRARY
  const [mode, setMode] = React.useState<Mode>(createInitialMode);

  const [loadedMap, setLoadedMap] = React.useState<null | MapEntity>(null);

  const localFetch = React.useCallback(
    (input, init = {}) => {
      return fetch(buildApiUrl(input), {
        ...init,
        headers: {
          Authorization: dmPassword ? `Bearer ${dmPassword}` : undefined,
          ...init.headers,
        },
      }).then((res) => {
        if (res.status === 401) {
          console.error("Unauthenticated access.");
          throw new Error("Unauthenticated access.");
        }
        return res;
      });
    },
    [dmPassword]
  );

  // load initial state
  useAsyncEffect(
    function* (_, c) {
      setLoadedMap(null);
      const { data }: { data: MapEntity | null } = yield* c(
        localFetch(`/map/${loadedMapId}`).then((res) => res.json())
      );
      const isLoadedMapAvailable = !!data;

      if (isLoadedMapAvailable === true) {
        setLoadedMap(data ?? null);
        setMode({ title: "EDIT_MAP" });
      } else {
        setLoadedMap(null);
        setMode({ title: "SHOW_MAP_LIBRARY" });
      }
    },
    [setLoadedMap, localFetch, dmPassword, socket, loadedMapId]
  );

  // token add/remove/update event handlers
  React.useEffect(() => {
    if (!loadedMapId) return;
    const eventName = `token:mapId:${loadedMapId}`;
    socket.on(eventName, (ev: SocketTokenEvent) => {
      if (ev.type === "add") {
        const data = ev.data;
        setLoadedMap(
          produce((map: MapEntity | null) => {
            if (map) {
              map.tokens.push(...data.tokens);
            }
          })
        );
      } else if (ev.type === "update") {
        const data = ev.data;
        setLoadedMap(
          produce((map: null | MapEntity) => {
            if (map) {
              const updatedTokens = new Map<string, any>();
              for (const token of data.tokens) {
                updatedTokens.set(token.id, token);
              }
              map.tokens = map.tokens.map((token) => {
                const updatedToken = updatedTokens.get(token.id);
                if (!updatedToken) {
                  return token;
                }
                return {
                  ...token,
                  ...updatedToken,
                };
              });
            }
          })
        );
      } else if (ev.type === "remove") {
        const data = ev.data;
        setLoadedMap(
          produce((map: null | MapEntity) => {
            if (map) {
              const tokenIds = new Set(data.tokenIds);
              map.tokens = map.tokens.filter(
                (token) => tokenIds.has(token.id) === false
              );
            }
          })
        );
      }
    });

    return () => {
      socket.off(eventName);
    };
  }, [socket, loadedMapId, setLoadedMap]);

  const updateMap = React.useCallback(
    async (mapId: string, data: Partial<MapEntity>) => {
      const res = await localFetch(`/map/${mapId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((res) => res.json());

      if (!res.data.map) {
        return;
      }

      setLoadedMap(
        produce((map) => {
          if (map) {
            return { ...map, ...(res.data.map as MapEntity) };
          }
          return map;
        })
      );
    },
    [localFetch]
  );

  const updateToken = React.useCallback(
    (id: string, updates: TokenPartial) => {
      localFetch(`/map/${loadedMapId}/token/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...updates, socketId: socket.id }),
      });
    },
    [loadedMapId, localFetch, socket.id]
  );

  const dmPasswordRef = React.useRef(dmPassword);

  React.useEffect(() => {
    dmPasswordRef.current = dmPassword;
  });

  const sendLiveMapTaskRef = React.useRef<null | ISendRequestTask>(null);
  const sendLiveMap = React.useCallback(
    async (canvas: HTMLCanvasElement) => {
      const loadedMapId = loadedMap?.id;

      if (!loadedMapId) {
        return;
      }

      if (sendLiveMapTaskRef.current) {
        sendLiveMapTaskRef.current.abort();
      }
      const blob = await new Promise<Blob>((res) => {
        canvas.toBlob((blob) => {
          res(blob!);
        });
      });

      const image = new File([blob], "fog.live.png", {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("image", image);

      const task = sendRequest({
        url: buildApiUrl(`/map/${loadedMapId}/send`),
        method: "POST",
        body: formData,
        headers: {
          Authorization: dmPassword ? `Bearer ${dmPassword}` : null,
        },
      });
      sendLiveMapTaskRef.current = task;
      const result = await task.done;
      if (result.type !== "success") {
        return;
      }
    },
    [loadedMap?.id, dmPassword]
  );

  const sendProgressFogTaskRef = React.useRef<null | ISendRequestTask>(null);
  const saveFogProgress = React.useCallback(
    async (canvas: HTMLCanvasElement) => {
      const loadedMapId = loadedMap?.id;

      if (!loadedMapId) {
        return;
      }

      if (sendLiveMapTaskRef.current) {
        sendLiveMapTaskRef.current.abort();
      }
      const blob = await new Promise<Blob>((res) => {
        canvas.toBlob((blob) => {
          res(blob!);
        });
      });

      const formData = new FormData();

      formData.append(
        "image",
        new File([blob], "fog.png", {
          type: "image/png",
        })
      );

      const task = sendRequest({
        url: buildApiUrl(`/map/${loadedMapId}/fog`),
        method: "POST",
        body: formData,
        headers: {
          Authorization: dmPassword ? `Bearer ${dmPassword}` : null,
        },
      });
      sendProgressFogTaskRef.current = task;
      const result = await task.done;
      if (result.type !== "success") {
        return;
      }
    },
    [loadedMap?.id, dmPassword]
  );

  const hideMap = React.useCallback(async () => {
    await localFetch("/active-map", {
      method: "POST",
      body: JSON.stringify({
        mapId: null,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }, [localFetch]);

  const showMapModal = React.useCallback(() => {
    setMode({ title: "SHOW_MAP_LIBRARY" });
  }, []);

  const [importModalFile, setImportModalFile] = React.useState<null | File>(
    null
  );

  const [markedAreas, setMarkedAreas] = React.useState<MarkedAreaEntity[]>(
    () => []
  );

  const onMarkArea = ([x, y]: [number, number]) => {
    socket.emit("mark area", {
      x,
      y,
    });
  };

  React.useEffect(() => {
    socket.on(
      "mark area",
      async (data: { id: string; x: number; y: number }) => {
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
      }
    );

    return () => {
      socket.off("mark area");
    };
  }, [socket]);

  const actions = useNoteWindowActions();
  const controlRef = React.useRef<MapControlInterface | null>(null);

  const dragRef = React.useRef(0);
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);

  const objectUrlCleanupRef = React.useRef<null | (() => void)>(null);
  React.useEffect(
    () => () => {
      objectUrlCleanupRef.current?.();
    },
    []
  );
  const [cropperNode, selectFile] = useTokenImageUpload();
  const relayEnvironment = useRelayEnvironment();
  return (
    <FetchContext.Provider value={localFetch}>
      {mode.title === "SHOW_MAP_LIBRARY" ? (
        <SelectMapModal
          canClose={loadedMap !== null}
          loadedMapId={loadedMapId}
          liveMapId={activeMapResponse.data?.activeMap?.id ?? null}
          closeModal={() => {
            setMode({ title: "EDIT_MAP" });
          }}
          setLoadedMapId={(loadedMapId) => {
            setMode({ title: "EDIT_MAP" });
            setLoadedMapId(loadedMapId);
          }}
          dmPassword={dmPassword}
        />
      ) : null}
      {mode.title === "MEDIA_LIBRARY" ? (
        <MediaLibrary
          onClose={() => {
            setMode({ title: "EDIT_MAP" });
          }}
        />
      ) : null}
      {loadedMap ? (
        <LoadedMapDiv
          onDragEnter={(ev) => {
            if (isFileDrag(ev) === false) {
              return;
            }
            ev.dataTransfer.dropEffect = "copy";
            dragRef.current++;
            setIsDraggingFile(dragRef.current !== 0);
            ev.preventDefault();
          }}
          onDragLeave={(ev) => {
            if (isFileDrag(ev) === false) {
              return;
            }
            dragRef.current--;
            setIsDraggingFile(dragRef.current !== 0);
            ev.preventDefault();
          }}
          onDragOver={(ev) => {
            if (isFileDrag(ev) === false) {
              return;
            }
            ev.preventDefault();
          }}
          onDrop={(ev) => {
            ev.preventDefault();
            if (isFileDrag(ev) === false) {
              return;
            }
            dragRef.current = 0;
            setIsDraggingFile(dragRef.current !== 0);

            const [file] = Array.from(ev.dataTransfer.files);

            if (!file?.type.match(/image/)) {
              return;
            }
            const context = controlRef.current?.getContext();

            if (!context) {
              return;
            }
            const coords = context.helper.coordinates.screenToImage([
              ev.clientX,
              ev.clientY,
            ]);

            const addTokenWithImageId = (tokenImageId: string) => {
              commitMutation<dmAreaTokenAddManyMutation>(relayEnvironment, {
                mutation: DmAreaTokenAddManyMutation,
                variables: {
                  input: {
                    mapId: loadedMap.id,
                    tokens: [
                      {
                        color: "red",
                        x: coords[0],
                        y: coords[1],
                        rotation: 0,
                        isVisibleForPlayers: false,
                        isMovableByPlayers: false,
                        isLocked: false,
                        tokenImageId,
                        label: "",
                      },
                    ],
                  },
                },
              });
            };

            selectFile(file, [], ({ tokenImageId }) => {
              addTokenWithImageId(tokenImageId);
            });
          }}
        >
          {cropperNode}
          {isDraggingFile ? (
            <Center
              position="absolute"
              top="0"
              width="100%"
              zIndex={99999999}
              justifyContent="center"
            >
              <DropZone
                onDragEnter={(ev) => {
                  if (isFileDrag(ev) === false) {
                    return;
                  }
                  ev.dataTransfer.dropEffect = "copy";
                  dragRef.current++;
                  setIsDraggingFile(dragRef.current !== 0);
                  ev.preventDefault();
                }}
                onDragLeave={(ev) => {
                  if (isFileDrag(ev) === false) {
                    return;
                  }
                  dragRef.current--;
                  setIsDraggingFile(dragRef.current !== 0);
                  ev.preventDefault();
                }}
                onDragOver={(ev) => {
                  if (isFileDrag(ev) === false) {
                    return;
                  }
                  ev.preventDefault();
                }}
                onDrop={(ev) => {
                  ev.preventDefault();
                  if (isFileDrag(ev) === false) {
                    return;
                  }

                  dragRef.current = 0;
                  setIsDraggingFile(dragRef.current !== 0);

                  ev.stopPropagation();
                  const [file] = Array.from(ev.dataTransfer.files);
                  if (file) {
                    setImportModalFile(file);
                  }
                }}
              >
                Import Map or Media Library Item
              </DropZone>
            </Center>
          ) : null}
          <div
            style={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <DmMap
              controlRef={controlRef}
              password={dmPassword}
              map={loadedMap}
              liveMapId={activeMapResponse.data?.activeMap?.id ?? null}
              sendLiveMap={sendLiveMap}
              saveFogProgress={saveFogProgress}
              hideMap={hideMap}
              showMapModal={showMapModal}
              openNotes={() => {
                actions.showNoteInWindow(null, "note-editor", true);
              }}
              openMediaLibrary={() => {
                setMode({ title: "MEDIA_LIBRARY" });
              }}
              markedAreas={markedAreas}
              markArea={onMarkArea}
              removeMarkedArea={(id) => {
                setMarkedAreas((areas) =>
                  areas.filter((area) => area.id !== id)
                );
              }}
              updateToken={updateToken}
              updateMap={(map) => {
                updateMap(loadedMap.id, map);
              }}
            />
          </div>
        </LoadedMapDiv>
      ) : null}
      {importModalFile ? (
        <ImportFileModal
          file={importModalFile}
          close={() => setImportModalFile(null)}
        />
      ) : null}
    </FetchContext.Provider>
  );
};

const DmAreaRenderer = ({
  password,
}: {
  password: string;
}): React.ReactElement => {
  const socket = useSocket();

  return (
    <AccessTokenProvider value={password}>
      <AuthenticatedAppShell
        socket={socket}
        password={password}
        isMapOnly={false}
        role="DM"
      >
        <Content socket={socket} password={password} />
      </AuthenticatedAppShell>
    </AccessTokenProvider>
  );
};

export const DmArea = () => {
  const [dmPassword, setDmPassword] = useDmPassword();
  // "authenticate" | "authenticated"
  const [mode, setMode] = React.useState("loading");

  const localFetch = React.useCallback(
    (input, init = {}) => {
      return fetch(buildApiUrl(input), {
        ...init,
        headers: {
          Authorization: dmPassword ? `Bearer ${dmPassword}` : undefined,
          ...init.headers,
        },
      }).then((res) => {
        if (res.status === 401) {
          console.error("Unauthenticated access.");
          throw new Error("Unauthenticated access.");
        }
        return res;
      });
    },
    [dmPassword]
  );

  useAsyncEffect(
    function* (_, c) {
      const result: { data: { role: string } } = yield* c(
        localFetch("/auth").then((res) => res.json())
      );
      if (!result.data.role || result.data.role !== "DM") {
        setMode("authenticate");
        return;
      }
      setMode("authenticated");
    },
    [localFetch]
  );

  if (mode === "loading") {
    return <SplashScreen text="Loading...." />;
  } else if (mode === "authenticate") {
    return (
      <AuthenticationScreen
        onAuthenticate={(password) => {
          setDmPassword(password);
          setMode("authenticated");
        }}
        fetch={localFetch}
        requiredRole="DM"
      />
    );
  } else if (mode === "authenticated") {
    return <DmAreaRenderer password={dmPassword} />;
  }
  return null;
};

type DropZoneProps = {
  children: React.ReactNode;
} & Pick<
  React.ComponentProps<typeof Box>,
  "onDragEnter" | "onDragOver" | "onDragLeave" | "onDrop"
>;

const DropZone = (props: DropZoneProps): React.ReactElement => {
  return (
    <Box
      padding="2"
      background="white"
      borderRadius="10px"
      outline="2px dashed black"
      outlineOffset="-10px"
      onDragEnter={props.onDragEnter}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
    >
      <Box padding="2">{props.children}</Box>
    </Box>
  );
};
