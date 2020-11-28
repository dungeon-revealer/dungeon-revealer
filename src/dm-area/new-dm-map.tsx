import * as React from "react";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import { v4 as uuid } from "uuid";
import styled from "@emotion/styled/macro";
import * as Icons from "../feather-icons";
import { Toolbar } from "../toolbar";
import type { MapTool } from "../map-tools/map-tool";
import { DragPanZoomMapTool } from "../map-tools/drag-pan-zoom-map-tool";
import {
  BrushMapTool,
  BrushToolContextProvider,
} from "../map-tools/brush-map-tool";
import { MapView, MapControlInterface } from "../map-view";
import { buildApiUrl } from "../public-url";
import { loadImage } from "../util";
import { BrushShape, FogMode } from "../canvas-draw-utilities";
import { AreaSelectMapTool } from "../map-tools/area-select-map-tool";
import { ISendRequestTask, sendRequest } from "../http-request";
import { useOnClickOutside } from "../hooks/use-on-click-outside";

type ToolMapRecord = {
  name: string;
  icon: React.ReactElement;
  tool: MapTool<any, any>;
  MenuComponent: null | (() => React.ReactElement);
};

const BrushSettings = (): React.ReactElement => {
  const { state, setState } = React.useContext(BrushMapTool.Context);

  return (
    <>
      <h6 style={{ margin: 0, marginBottom: 12 }}>Brush Shape</h6>
      <div style={{ display: "flex" }}>
        <div style={{ flex: 1, textAlign: "left" }}>
          <ShapeButton
            isActive={BrushShape.circle === state.brushShape}
            onClick={() => {
              setState((state) => ({
                ...state,
                brushShape: BrushShape.circle,
              }));
            }}
          >
            <Icons.CircleIcon size={20} />
            <Icons.Label>Circle</Icons.Label>
          </ShapeButton>
        </div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <ShapeButton
            isActive={BrushShape.square === state.brushShape}
            onClick={() => {
              setState((state) => ({
                ...state,
                brushShape: BrushShape.square,
              }));
            }}
          >
            <Icons.SquareIcon size={20} />
            <Icons.Label>Square</Icons.Label>
          </ShapeButton>
        </div>
      </div>
      <h6 style={{ margin: 0, marginTop: 12, marginBottom: 0 }}>Brush Size</h6>
      <input
        type="range"
        min="1"
        max="200"
        step="1"
        value={state.brushSize}
        onChange={(ev) => {
          setState((state) => ({
            ...state,
            brushSize: Math.min(
              200,
              Math.max(0, parseInt(ev.target.value, 10))
            ),
          }));
        }}
      />
      <div style={{ display: "flex" }}>
        <div
          style={{
            flex: 1,
            textAlign: "left",
            fontWeight: "bold",
            fontSize: 10,
          }}
        >
          1
        </div>
        <div
          style={{
            flex: 1,
            textAlign: "right",
            fontWeight: "bold",
            fontSize: 10,
          }}
        >
          200
        </div>
      </div>
    </>
  );
};

const ShroudRevealSettings = (): React.ReactElement => {
  const { state, setState } = React.useContext(BrushMapTool.Context);
  return (
    <>
      <Toolbar.Item isActive={state.fogMode === FogMode.clear}>
        <Toolbar.Button
          onClick={() =>
            setState((state) => ({ ...state, fogMode: FogMode.clear }))
          }
        >
          <Icons.EyeIcon size={20} />
          <Icons.Label>Reveal</Icons.Label>
        </Toolbar.Button>
      </Toolbar.Item>
      <Toolbar.Item isActive={state.fogMode === FogMode.shroud}>
        <Toolbar.Button
          onClick={() =>
            setState((state) => ({ ...state, fogMode: FogMode.shroud }))
          }
        >
          <Icons.EyeOffIcon size={20} />
          <Icons.Label>Shroud</Icons.Label>
        </Toolbar.Button>
      </Toolbar.Item>
    </>
  );
};

const DM_TOOL_MAP: Array<ToolMapRecord> = [
  {
    name: "Move",
    icon: <Icons.MoveIcon size={20} />,
    tool: DragPanZoomMapTool,
    MenuComponent: null,
  },
  {
    name: "Brush",
    icon: <Icons.PenIcon size={20} />,
    tool: BrushMapTool,
    MenuComponent: BrushSettings,
  },
  {
    name: "Area",
    icon: <Icons.CropIcon size={20} />,
    tool: AreaSelectMapTool,
    MenuComponent: null,
  },
];

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

export const NewDmSection = () => {
  // TODO: pcPassword shouldnt be hard coded
  const pcPassword = "";
  const [currentMap, setCurrentMap] = React.useState<null | Map>(null);
  const currentMapRef = React.useRef(currentMap);

  const [mapImage, setMapImage] = React.useState<HTMLImageElement | null>(null);
  const [fogImage, setFogImage] = React.useState<HTMLImageElement | null>(null);

  const controlRef = React.useRef<MapControlInterface | null>(null);
  /**
   * used for canceling pending requests in case there is a new update incoming.
   * should be either null or an array of tasks returned by loadImage
   */
  const pendingFogImageLoad = React.useRef<(() => void) | null>(null);
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
      pendingFogImageLoad.current?.();
      pendingFogImageLoad.current = null;
    }

    /**
     * Hide map (show splashscreen)
     */
    if (!data.map) {
      currentMapRef.current = null;
      setCurrentMap(null);
      setFogImage(null);
      setMapImage(null);
      return;
    }
    /**
     * Fog has updated
     */
    if (currentMapRef.current && currentMapRef.current.id === data.map.id) {
      const imageUrl = buildApiUrl(
        // prettier-ignore
        `/map/${data.map.id}/fog?cache_buster=${createCacheBusterString()}&authorization=${encodeURIComponent(pcPassword)}`
      );

      const task = loadImage(imageUrl);
      pendingFogImageLoad.current = () => task.cancel();

      task.promise
        .then((fogImage) => {
          setFogImage(fogImage);
        })
        .catch(() => {
          console.log("Cancel loading image.");
        });
      return;
    }

    /**
     * Load new map
     */
    currentMapRef.current = data.map;

    const mapImageUrl = buildApiUrl(
      // prettier-ignore
      `/map/${data.map.id}/map?authorization=${encodeURIComponent(pcPassword)}`
    );

    const fogImageUrl = buildApiUrl(
      // prettier-ignore
      `/map/${data.map.id}/fog?cache_buster=${createCacheBusterString()}&authorization=${encodeURIComponent(pcPassword)}`
    );

    const loadMapImageTask = loadImage(mapImageUrl);
    const loadFogImageTask = loadImage(fogImageUrl);

    pendingFogImageLoad.current = () => {
      loadMapImageTask.cancel();
      loadFogImageTask.cancel();
    };

    Promise.all([loadMapImageTask.promise, loadFogImageTask.promise])
      .then(([mapImage, fogImage]) => {
        setMapImage(mapImage);
        setFogImage(fogImage);
        setCurrentMap(data.map);
      })
      .catch(() => {
        console.log("Cancel loading image.");
      });
  }, []);

  useAsyncEffect(
    function* (_, cast) {
      const result = yield* cast(
        fetch(buildApiUrl("/active-map")).then((res) => res.json())
      );
      const activeMap = result.data.activeMap;

      if (activeMap) {
        onReceiveMap({ map: activeMap });
      }

      return () => {
        if (pendingFogImageLoad.current) {
          pendingFogImageLoad.current?.();
          pendingFogImageLoad.current = null;
        }
      };
    },
    [pcPassword, refetchTrigger]
  );

  // TODO: this should be persisted state
  const [activeTool, setActiveTool] = React.useState<null | MapTool<any, any>>(
    DM_TOOL_MAP[0].tool
  );

  const sendLiveMapTaskRef = React.useRef<ISendRequestTask | null>(null);

  const sendLiveMap = React.useCallback(
    async (canvas: HTMLCanvasElement) => {
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
        url: buildApiUrl(`/map/${currentMap!.id}/send`),
        method: "POST",
        body: formData,
        headers: {
          Authorization: pcPassword ? `Bearer ${pcPassword}` : null,
        },
      });
      sendLiveMapTaskRef.current = task;
      const result = await task.done;
      if (result.type !== "success") return;
      // setLiveMapId(loadedMapId);
    },
    [currentMap?.id, pcPassword]
  );

  return (
    <BrushToolContextProvider
      onDrawEnd={(canvas) => {
        console.log("ON DRAW END!!!");
        // TODO: toggle between instant send and incremental send :)
        sendLiveMap(canvas);
      }}
    >
      {mapImage && currentMap ? (
        <MapView
          activeTool={activeTool}
          mapImage={mapImage}
          fogImage={fogImage}
          controlRef={controlRef}
          tokens={currentMap.tokens}
          updateTokenPosition={(id, position) => {
            // TODO: map tokens should be movable
            //  updateToken({ id, ...position })
          }}
          markedAreas={markedAreas}
          markArea={({ x, y }) => {
            // TODO: re-implement mark area
            //    socket.emit("mark area", { x, y });
          }}
          removeMarkedArea={(id) => {
            // TODO: re-implement mark are
            //  setMarkedAreas((markedAreas) =>
            //    markedAreas.filter((area) => area.id !== id)
            //  );
          }}
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
          sharedContexts={DM_TOOL_MAP.map((record) => record.tool.Context)}
          fogOpacity={0.5}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "absolute",
          height: "100%",
          top: 0,
          left: 12,
          pointerEvents: "none",
        }}
      >
        <Toolbar>
          <Toolbar.Logo />
          <Toolbar.Group divider>
            {DM_TOOL_MAP.map((record) => (
              <MenuItemRenderer
                key={record.tool.id}
                record={record}
                isActive={record.tool === activeTool}
                setActiveTool={() => {
                  setActiveTool(record.tool);
                }}
              />
            ))}
          </Toolbar.Group>
          <Toolbar.Group divider>
            <ShroudRevealSettings />
          </Toolbar.Group>
        </Toolbar>
      </div>
    </BrushToolContextProvider>
  );
};

const MenuItemRenderer = (props: {
  record: ToolMapRecord;
  setActiveTool: () => void;
  isActive: boolean;
}): React.ReactElement => {
  const [showMenu, setShowMenu] = React.useState(false);
  const ref = useOnClickOutside<HTMLLIElement>(() => {
    setShowMenu(false);
  });

  return (
    <Toolbar.Item isActive={props.isActive} ref={ref}>
      <Toolbar.Button
        onClick={() => {
          props.setActiveTool();
          setShowMenu((showMenu) => !showMenu);
        }}
      >
        {props.record.icon}
        <Icons.Label>{props.record.name} </Icons.Label>
      </Toolbar.Button>
      {props.record.MenuComponent && props.isActive && showMenu ? (
        <Toolbar.Popup>
          <props.record.MenuComponent />
        </Toolbar.Popup>
      ) : null}
    </Toolbar.Item>
  );
};

const ShapeButton = styled.button<{ isActive: boolean }>`
  border: none;
  cursor: pointer;
  background-color: transparent;
  color: ${(p) => (p.isActive ? "rgba(0, 0, 0, 1)" : "hsl(211, 27%, 70%)")};
  &:hover {
    filter: drop-shadow(
      0 0 4px
        ${(p) => (p.isActive ? "rgba(0, 0, 0, .3)" : "rgba(200, 200, 200, .6)")}
    );
  }
  > svg {
    stroke: ${(p) => (p.isActive ? "rgba(0, 0, 0, 1)" : "hsl(211, 27%, 70%)")};
  }
`;
