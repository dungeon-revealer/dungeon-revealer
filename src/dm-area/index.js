import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback
} from "react";
import createPersistedState from "use-persisted-state";
import { Modal } from "./modal";
import { DmMap } from "./dm-map";
import { SelectMapModal } from "./select-map-modal";
import { SetMapGrid } from "./set-map-grid";

const useLoadedMapId = createPersistedState("loadedMapId");

const INITIAL_MODE = {
  title: "EDIT_MAP",
  data: null
};

export const DmArea = () => {
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

  useEffect(() => {
    fetch("/map")
      .then(res => {
        return res.json();
      })
      .then(res => {
        setData(res.data);
        const isLoadedMapAvailable = Boolean(
          res.data.maps.find(map => map.id === loadedMapIdRef.current)
        );
        const isLiveMapAvailable = Boolean(
          res.data.maps.find(map => map.id === res.data.currentMapId)
        );

        if (!isLiveMapAvailable && !isLoadedMapAvailable) {
          setMode({ title: "EDIT_MAP" });
          setLoadedMapId(null);
          return;
        }

        setLiveMapId(isLiveMapAvailable ? res.data.currentMapId : null);
        setLoadedMapId(
          isLoadedMapAvailable ? loadedMapIdRef.current : res.data.currentMapId
        );
      });
  }, [setLoadedMapId]);

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

    setData(data => ({
      ...data,
      maps: data.maps.map(map => {
        if (map.id !== res.data.map.id) {
          return map;
        } else {
          return { ...map, ...res.data.map };
        }
      })
    }));
  }, []);

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
          deleteMap={async mapId => {
            await fetch(`/map/${mapId}`, {
              method: "DELETE"
            });
            setData(data => ({
              ...data,
              maps: data.maps.filter(map => map.id !== mapId)
            }));
          }}
          createMap={async ({ file, title }) => {
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
          }}
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
          map={loadedMap}
          loadedMapId={loadedMap.id}
          liveMapId={liveMapId}
          sendLiveMap={async ({ image }) => {
            await fetch(`/map/${loadedMap.id}/send`, {
              method: "POST",
              body: JSON.stringify({
                image
              }),
              headers: {
                "Content-Type": "application/json"
              }
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
        />
      ) : null}
    </Modal.Provider>
  );
};
