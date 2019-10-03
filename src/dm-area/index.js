import "./offscreen-canvas-polyfill";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback
} from "react";
import produce from "immer";
import debounce from "lodash/debounce";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import createPersistedState from "use-persisted-state";
import { Modal } from "./modal";
import { DmMap } from "./dm-map";
import { SelectMapModal } from "./select-map-modal";
import { SetMapGrid } from "./set-map-grid";
import { useSocket } from "../socket";
import { useStaticRef } from "../hooks/use-static-ref";

const useLoadedMapId = createPersistedState("loadedMapId");

const INITIAL_MODE = {
  title: "EDIT_MAP",
  data: null
};

export const DmArea = () => {
  const socket = useSocket();
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
        data.maps.find(map => map.id === mode.data.mapId)) ||
      null,
    [data, mode]
  );
  const loadedMap = useMemo(
    () => (data ? data.maps.find(map => map.id === loadedMapId) || null : null),
    [data, loadedMapId]
  );

  // load initial state
  useAsyncEffect(
    function*() {
      const { data } = yield fetch("/map").then(res => res.json());
      setData(data);
      const isLoadedMapAvailable = Boolean(
        data.maps.find(map => map.id === loadedMapIdRef.current)
      );

      const isLiveMapAvailable = Boolean(
        data.maps.find(map => map.id === data.currentMapId)
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
    },
    [setLoadedMapId]
  );

  // token add/remove/update event handlers
  useEffect(() => {
    if (!loadedMapId) return;
    const eventName = `token:mapId:${loadedMapId}`;
    socket.on(eventName, ({ type, data }) => {
      if (type === "add") {
        setData(
          produce(appData => {
            const map = appData.maps.find(map => map.id === loadedMapId);
            map.tokens.push(data.token);
          })
        );
      } else if (type === "update") {
        setData(
          produce(appData => {
            const map = appData.maps.find(map => map.id === loadedMapId);
            map.tokens = map.tokens.map(token => {
              if (token.id !== data.token.id) return token;
              return {
                ...token,
                ...data.token
              };
            });
          })
        );
      } else if (type === "remove") {
        setData(
          produce(appData => {
            const map = appData.maps.find(map => map.id === loadedMapId);
            map.tokens = map.tokens.filter(token => token.id !== data.tokenId);
          })
        );
      }
    });

    return () => socket.off(eventName);
  }, [socket, loadedMapId, setData]);

  const createMap = useCallback(async ({ file, title }) => {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("title", title);

    const res = await fetch(`/map`, {
      method: "POST",
      body: formData
    }).then(res => res.json());
    setData(data => ({
      ...data,
      maps: [...data.maps, res.data.map]
    }));
  }, []);

  const updateMap = useCallback(async (mapId, data) => {
    const res = await fetch(`/map/${mapId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }).then(res => res.json());

    if (!res.data.map) {
      return;
    }

    setData(
      produce(data => {
        data.maps = data.maps.map(map => {
          if (map.id !== res.data.map.id) {
            return map;
          } else {
            return { ...map, ...res.data.map };
          }
        });
      })
    );
  }, []);

  const deleteMap = useCallback(async mapId => {
    await fetch(`/map/${mapId}`, {
      method: "DELETE"
    });
    setData(data => ({
      ...data,
      maps: data.maps.filter(map => map.id !== mapId)
    }));
  }, []);

  const deleteToken = useCallback(
    tokenId => {
      fetch(`/map/${loadedMapId}/token/${tokenId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        }
      });
    },
    [loadedMapId]
  );

  const persistTokenChanges = useStaticRef(() =>
    debounce((loadedMapId, id, updates) => {
      fetch(`/map/${loadedMapId}/token/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...updates
        })
      });
    }, 100)
  );

  const updateToken = useCallback(
    ({ id, ...updates }) => {
      setData(
        produce(data => {
          const map = data.maps.find(map => map.id === loadedMapId);
          map.tokens = map.tokens.map(token => {
            if (token.id !== id) return token;
            return { ...token, ...updates };
          });
        })
      );

      persistTokenChanges(loadedMapId, id, updates);
    },
    [loadedMapId, persistTokenChanges]
  );

  return (
    <Modal.Provider>
      {mode.title === "SHOW_MAP_LIBRARY" ? (
        <SelectMapModal
          canClose={loadedMap !== null}
          maps={data.maps}
          loadedMapId={loadedMapId}
          liveMapId={liveMapId}
          closeModal={() => {
            setMode({ title: "EDIT_MAP" });
          }}
          setLoadedMapId={loadedMapId => {
            setMode({ title: "EDIT_MAP" });
            setLoadedMapId(loadedMapId);
          }}
          updateMap={updateMap}
          deleteMap={deleteMap}
          createMap={createMap}
          enterGridMode={mapId =>
            setMode({ title: "SET_MAP_GRID", data: { mapId } })
          }
        />
      ) : null}
      {setMapGridTargetMap ? (
        <SetMapGrid
          map={setMapGridTargetMap}
          onSuccess={(mapId, grid) => {
            updateMap(mapId, {
              grid
            });
            setMode({ title: "SHOW_MAP_LIBRARY" });
          }}
          onAbort={() => {
            setMode({ title: "SHOW_MAP_LIBRARY" });
          }}
        />
      ) : loadedMap ? (
        <DmMap
          setAppData={setData}
          socket={socket}
          map={loadedMap}
          loadedMapId={loadedMap.id}
          liveMapId={liveMapId}
          sendLiveMap={async ({ image }) => {
            const formData = new FormData();
            formData.append("image", image);

            await fetch(`/map/${loadedMap.id}/send`, {
              method: "POST",
              body: formData
            });
            setLiveMapId(loadedMap.id);
          }}
          hideMap={async () => {
            await fetch("/active-map", {
              method: "POST",
              body: JSON.stringify({
                mapId: null
              }),
              headers: {
                "Content-Type": "application/json"
              }
            });
            setLiveMapId(null);
          }}
          showMapModal={() => {
            setMode({ title: "SHOW_MAP_LIBRARY" });
          }}
          enterGridMode={() => {
            setMode({ title: "SET_MAP_GRID", data: { mapId: loadedMapId } });
          }}
          updateMap={updateMap}
          deleteToken={deleteToken}
          updateToken={updateToken}
        />
      ) : null}
    </Modal.Provider>
  );
};
