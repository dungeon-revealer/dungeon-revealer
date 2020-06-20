import "./offscreen-canvas-polyfill";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import produce from "immer";
import debounce from "lodash/debounce";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import createPersistedState from "use-persisted-state";
import { DmMap } from "./dm-map";
import { SelectMapModal } from "./select-map-modal";
import { ImportFileModal } from "./import-file-modal";
import { NoteEditor } from "./note-editor";
import { MediaLibrary } from "./media-library";
import { SetMapGrid } from "./set-map-grid";
import { useSocket } from "../socket";
import { buildApiUrl } from "../public-url";
import { useStaticRef } from "../hooks/use-static-ref";
import { ShareImageActionProvider } from "../hooks/use-share-image-action";
import { AuthenticationScreen } from "../authentication-screen";
import { SplashScreen } from "../splash-screen";
import { FetchContext } from "./fetch-context";
import { ToastProvider } from "react-toast-notifications";
import { sendRequest } from "../http-request";
import { AuthenticatedAppShell } from "../authenticated-app-shell";
import {
  ActiveNoteIdContext,
  SetActiveNoteIdContext,
} from "./token-info-aside";
import { AccessTokenProvider } from "../hooks/use-access-token";

const useLoadedMapId = createPersistedState("loadedMapId");
const useDmPassword = createPersistedState("dmPassword");

const INITIAL_MODE = {
  title: "LOADING",
  data: null,
};

const Content = ({ socket, password: dmPassword }) => {
  const [data, setData] = useState(null);
  const [loadedMapId, setLoadedMapId] = useLoadedMapId(null);
  const loadedMapIdRef = useRef(loadedMapId);
  const [liveMapId, setLiveMapId] = useState(null);
  // EDIT_MAP, SET_MAP_GRID, SHOW_MAP_LIBRARY
  const [mode, setMode] = useState(INITIAL_MODE);

  const setMapGridTargetMap = useMemo(
    () =>
      (data &&
        mode.title === "SET_MAP_GRID" &&
        data.maps.find((map) => map.id === mode.data.mapId)) ||
      null,
    [data, mode]
  );
  const loadedMap = useMemo(
    () =>
      data ? data.maps.find((map) => map.id === loadedMapId) || null : null,
    [data, loadedMapId]
  );

  const localFetch = useCallback(
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
    function* () {
      const { data } = yield localFetch("/map").then((res) => res.json());
      setData(data);
      const isLoadedMapAvailable = Boolean(
        data.maps.find((map) => map.id === loadedMapIdRef.current)
      );

      const isLiveMapAvailable = Boolean(
        data.maps.find((map) => map.id === data.currentMapId)
      );

      if (!isLiveMapAvailable && !isLoadedMapAvailable) {
        setMode({ title: "SHOW_MAP_LIBRARY" });
        setLoadedMapId(null);
        return;
      }

      setLiveMapId(isLiveMapAvailable ? data.currentMapId : null);
      setLoadedMapId(
        isLoadedMapAvailable ? loadedMapIdRef.current : data.currentMapId
      );
      setMode({ title: "EDIT_MAP" });
    },
    [setLoadedMapId, localFetch, dmPassword, socket]
  );

  // token add/remove/update event handlers
  useEffect(() => {
    if (!loadedMapId) return;
    const eventName = `token:mapId:${loadedMapId}`;
    socket.on(eventName, ({ type, data }) => {
      if (type === "add") {
        setData(
          produce((appData) => {
            const map = appData.maps.find((map) => map.id === loadedMapId);
            map.tokens.push(data.token);
          })
        );
      } else if (type === "update") {
        setData(
          produce((appData) => {
            const map = appData.maps.find((map) => map.id === loadedMapId);
            map.tokens = map.tokens.map((token) => {
              if (token.id !== data.token.id) return token;
              return {
                ...token,
                ...data.token,
              };
            });
          })
        );
      } else if (type === "remove") {
        setData(
          produce((appData) => {
            const map = appData.maps.find((map) => map.id === loadedMapId);
            map.tokens = map.tokens.filter(
              (token) => token.id !== data.tokenId
            );
          })
        );
      }
    });

    return () => socket.off(eventName);
  }, [socket, loadedMapId, setData]);

  const createMap = useCallback(
    async ({ file, title }) => {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("title", title);

      const response = await localFetch(`/map`, {
        method: "POST",
        body: formData,
      }).then((res) => res.json());
      setData((data) => ({
        ...data,
        maps: [...data.maps, response.data.map],
      }));
    },
    [localFetch]
  );

  const updateMap = useCallback(
    async (mapId, data) => {
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

      setData(
        produce((data) => {
          data.maps = data.maps.map((map) => {
            if (map.id !== res.data.map.id) {
              return map;
            } else {
              return { ...map, ...res.data.map };
            }
          });
        })
      );
    },
    [localFetch]
  );

  const deleteMap = useCallback(
    async (mapId) => {
      await localFetch(`/map/${mapId}`, {
        method: "DELETE",
      });
      setData((data) => ({
        ...data,
        maps: data.maps.filter((map) => map.id !== mapId),
      }));
    },
    [localFetch]
  );

  const deleteToken = useCallback(
    (tokenId) => {
      localFetch(`/map/${loadedMapId}/token/${tokenId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    [loadedMapId, localFetch]
  );

  const persistTokenChanges = useStaticRef(() =>
    debounce((loadedMapId, id, updates, localFetch) => {
      localFetch(`/map/${loadedMapId}/token/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...updates,
        }),
      });
    }, 100)
  );

  const updateToken = useCallback(
    ({ id, ...updates }) => {
      setData(
        produce((data) => {
          const map = data.maps.find((map) => map.id === loadedMapId);
          map.tokens = map.tokens.map((token) => {
            if (token.id !== id) return token;
            return { ...token, ...updates };
          });
        })
      );

      persistTokenChanges(loadedMapId, id, updates, localFetch);
    },
    [loadedMapId, persistTokenChanges, localFetch]
  );

  const sendLiveMapTaskRef = useRef(null);
  const dmPasswordRef = useRef(dmPassword);

  useEffect(() => {
    dmPasswordRef.current = dmPassword;
  });

  const sendLiveMap = useCallback(
    async ({ image }) => {
      if (sendLiveMapTaskRef.current) {
        sendLiveMapTaskRef.current.abort();
      }
      const formData = new FormData();
      formData.append("image", image);

      const task = sendRequest({
        url: buildApiUrl(`/map/${loadedMapId}/send`),
        method: "POST",
        body: formData,
        headers: {
          Authorization: dmPasswordRef.current
            ? `Bearer ${dmPasswordRef.current}`
            : undefined,
        },
      });
      sendLiveMapTaskRef.current = task;
      const result = await task.done;
      if (result.type !== "success") return;
      setLiveMapId(loadedMapId);
    },
    [loadedMapId]
  );

  const hideMap = useCallback(async () => {
    await localFetch("/active-map", {
      method: "POST",
      body: JSON.stringify({
        mapId: null,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    setLiveMapId(null);
  }, [localFetch]);

  const showMapModal = useCallback(() => {
    setMode({ title: "SHOW_MAP_LIBRARY" });
  }, []);

  const enterGridMode = useCallback(() => {
    setMode({ title: "SET_MAP_GRID", data: { mapId: loadedMapId } });
  }, [loadedMapId]);

  const [droppedFile, setDroppedFile] = React.useState(null);

  const onDropFile = React.useCallback(
    (file) => {
      setDroppedFile(file);
    },
    [setDroppedFile]
  );

  return (
    <FetchContext.Provider value={localFetch}>
      <ShareImageActionProvider socket={socket}>
        {mode.title === "SHOW_MAP_LIBRARY" ? (
          <SelectMapModal
            canClose={loadedMap !== null}
            maps={data.maps}
            loadedMapId={loadedMapId}
            liveMapId={liveMapId}
            closeModal={() => {
              setMode({ title: "EDIT_MAP" });
            }}
            setLoadedMapId={(loadedMapId) => {
              setMode({ title: "EDIT_MAP" });
              setLoadedMapId(loadedMapId);
            }}
            updateMap={updateMap}
            deleteMap={deleteMap}
            createMap={createMap}
            enterGridMode={(mapId) =>
              setMode({ title: "SET_MAP_GRID", data: { mapId } })
            }
            dmPassword={dmPassword}
          />
        ) : null}
        {mode.title === "SHOW_NOTES" ? (
          <React.Suspense fallback={null}>
            <NoteEditor
              onClose={() => {
                setMode({ title: "EDIT_MAP" });
              }}
            />
          </React.Suspense>
        ) : null}
        {mode.title === "MEDIA_LIBRARY" ? (
          <MediaLibrary
            onClose={() => {
              setMode({ title: "EDIT_MAP" });
            }}
          />
        ) : null}
        {setMapGridTargetMap ? (
          <SetMapGrid
            map={setMapGridTargetMap}
            onSuccess={(mapId, grid) => {
              updateMap(mapId, {
                grid,
              });
              setMode({ title: "SHOW_MAP_LIBRARY" });
            }}
            onAbort={() => {
              setMode({ title: "SHOW_MAP_LIBRARY" });
            }}
            dmPassword={dmPassword}
          />
        ) : loadedMap ? (
          <div style={{ display: "flex", height: "100vh" }}>
            <div
              style={{
                flex: 1,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <DmMap
                dmPassword={dmPassword}
                setAppData={setData}
                socket={socket}
                map={loadedMap}
                loadedMapId={loadedMap.id}
                liveMapId={liveMapId}
                sendLiveMap={sendLiveMap}
                hideMap={hideMap}
                showMapModal={showMapModal}
                openNotes={() => {
                  setMode({ title: "SHOW_NOTES" });
                }}
                openMediaLibrary={() => {
                  setMode({ title: "MEDIA_LIBRARY" });
                }}
                enterGridMode={enterGridMode}
                updateMap={updateMap}
                deleteToken={deleteToken}
                updateToken={updateToken}
                onDropFile={onDropFile}
              />
            </div>
          </div>
        ) : null}
        {droppedFile ? (
          <ImportFileModal
            file={droppedFile}
            close={() => setDroppedFile(null)}
            createMap={createMap}
          />
        ) : null}
      </ShareImageActionProvider>
    </FetchContext.Provider>
  );
};

const DmAreaRenderer = ({ password }) => {
  const socket = useSocket();

  return (
    <AccessTokenProvider value={password}>
      <ToastProvider placement="bottom-right">
        <AuthenticatedAppShell socket={socket} password={password}>
          <Content socket={socket} password={password} />
        </AuthenticatedAppShell>
      </ToastProvider>
    </AccessTokenProvider>
  );
};

export const DmArea = () => {
  const [dmPassword, setDmPassword] = useDmPassword("");
  // "authenticate" | "authenticated"
  const [mode, setMode] = React.useState("loading");

  const localFetch = useCallback(
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
    function* () {
      const result = yield localFetch("/auth").then((res) => res.json());
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
      />
    );
  } else if (mode === "authenticated") {
    return <DmAreaRenderer password={dmPassword} />;
  }
  return null;
};
