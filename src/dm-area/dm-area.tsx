import "./offscreen-canvas-polyfill";
import * as React from "react";
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
import { MapTokenEntity } from "../map-typings";
import { isFileDrag } from "../hooks/use-drop-zone";
import { useNoteWindowActions } from "./token-info-aside";
import { MapControlInterface } from "../map-view";
import { useTokenImageUpload } from "./token-image-upload";
import { dmAreaTokenAddManyMutation } from "./__generated__/dmAreaTokenAddManyMutation.graphql";
import { dmArea_MapQuery } from "./__generated__/dmArea_MapQuery.graphql";
import { useGameSettings } from "../game-settings";

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

type TokenPartial = Omit<Partial<MapTokenEntity>, "id">;

const LoadedMapDiv = styled.div`
  display: flex;
  height: 100vh;
  background-color: black;
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

const DmArea_MapQuery = graphql`
  query dmArea_MapQuery($loadedMapId: ID!, $noMap: Boolean!) @live {
    map(id: $loadedMapId) @skip(if: $noMap) {
      id
      ...dmMap_DMMapFragment
    }
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
  const gameSettings = useGameSettings();

  const refs = React.useRef({
    gameSettings,
  });

  React.useEffect(() => {
    refs.current = {
      gameSettings,
    };
  });

  const [loadedMapId, setLoadedMapId] = useLoadedMapId();

  const dmAreaResponse = useQuery<dmArea_MapQuery>(
    DmArea_MapQuery,
    {
      loadedMapId: loadedMapId ?? "",
      noMap: loadedMapId === null,
    },
    {}
  );

  React.useEffect(() => {
    if (loadedMapId === null && dmAreaResponse.data?.activeMap) {
      setLoadedMapId(dmAreaResponse.data.activeMap.id);
    }
  }, [dmAreaResponse.data?.activeMap?.id, loadedMapId]);

  // EDIT_MAP, SHOW_MAP_LIBRARY
  const [mode, setMode] = React.useState<Mode>(createInitialMode);

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
      const loadedMapId = dmAreaResponse.data?.map?.id;

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
    [dmAreaResponse.data?.map?.id, dmPassword]
  );

  const sendProgressFogTaskRef = React.useRef<null | ISendRequestTask>(null);
  const saveFogProgress = React.useCallback(
    async (canvas: HTMLCanvasElement) => {
      const loadedMapId = dmAreaResponse.data?.map?.id;

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

      if (refs.current.gameSettings.value.autoSendMapUpdates) {
        //Non-blocking send in the event it fails the map will still be saved
        sendLiveMap(canvas).then(() => {});
      }

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
    [dmAreaResponse.data?.map?.id, dmPassword]
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
      {(dmAreaResponse.error === null &&
        // because it is a live query isLoading is always true
        // thanks relay :D
        // so we wanna show the map library if the data is loaded aka data is not undefined but data.map is undefined :D
        dmAreaResponse.data &&
        !dmAreaResponse.data.map) ||
      mode.title === "SHOW_MAP_LIBRARY" ? (
        <SelectMapModal
          canClose={dmAreaResponse.data?.map !== null}
          loadedMapId={loadedMapId}
          liveMapId={dmAreaResponse.data?.map?.id ?? null}
          closeModal={() => {
            setMode({ title: "EDIT_MAP" });
          }}
          setLoadedMapId={(loadedMapId) => {
            setMode({ title: "EDIT_MAP" });
            setLoadedMapId(loadedMapId);
          }}
        />
      ) : null}
      {mode.title === "MEDIA_LIBRARY" ? (
        <MediaLibrary
          onClose={() => {
            setMode({ title: "EDIT_MAP" });
          }}
        />
      ) : null}
      {dmAreaResponse.data?.map != null ? (
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
                    mapId: dmAreaResponse.data!.map!.id,
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
              map={dmAreaResponse.data.map}
              liveMapId={dmAreaResponse.data?.activeMap?.id ?? null}
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
              updateToken={updateToken}
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
