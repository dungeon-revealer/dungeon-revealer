import * as React from "react";
import { v4 as uuid } from "uuid";
import styled from "@emotion/styled/macro";
import { useToasts } from "react-toast-notifications";
import * as Icons from "../feather-icons";
import { Toolbar } from "../toolbar";
import type { MapTool } from "../map-tools/map-tool";
import { DragPanZoomMapTool } from "../map-tools/drag-pan-zoom-map-tool";
import {
  BrushMapTool,
  BrushToolContextProvider,
} from "../map-tools/brush-map-tool";
import {
  MarkAreaMapTool,
  MarkAreaToolContext,
} from "../map-tools/mark-area-map-tool";
import { MapView, MapControlInterface } from "../map-view";
import { buildApiUrl } from "../public-url";
import { ConditionalWrap, loadImage } from "../util";
import { BrushShape, FogMode } from "../canvas-draw-utilities";
import { AreaSelectMapTool } from "../map-tools/area-select-map-tool";
import { useOnClickOutside } from "../hooks/use-on-click-outside";
import { useIsKeyPressed } from "../hooks/use-is-key-pressed";
import { useAsyncClipboardApi } from "../hooks/use-async-clipboard-api";
import { MapEntity, MarkedArea } from "../map-typings";
import { useConfirmationDialog } from "../hooks/use-confirmation-dialog";
import { applyFogRectangle } from "../canvas-draw-utilities";

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
  {
    name: "Mark",
    icon: <Icons.TargetIcon size={20} />,
    tool: MarkAreaMapTool,
    MenuComponent: null,
  },
];

const createCacheBusterString = () =>
  encodeURIComponent(`${Date.now()}_${uuid()}`);

export const NewDmSection = (props: {
  password: string;
  map: MapEntity;
  liveMapId: string | null;
  hideMap: () => void;
  showMapModal: () => void;
  openNotes: () => void;
  openMediaLibrary: () => void;
  enterGridMode: () => void;
  sendLiveMap: (image: HTMLCanvasElement) => void;
  saveFogProgress: (image: HTMLCanvasElement) => void;
  markArea: (point: [number, number]) => void;
  markedAreas: Array<MarkedArea>;
  removeMarkedArea: (id: string) => void;
  updateToken: (params: { id: string; x: number; y: number }) => void;
}) => {
  const currentMapRef = React.useRef(props.map);

  const [mapImage, setMapImage] = React.useState<HTMLImageElement | null>(null);
  const [fogImage, setFogImage] = React.useState<HTMLImageElement | null>(null);

  const controlRef = React.useRef<MapControlInterface | null>(null);
  /**
   * used for canceling pending requests in case there is a new update incoming.
   * should be either null or an array of tasks returned by loadImage
   */
  const pendingFogImageLoad = React.useRef<(() => void) | null>(null);

  const onReceiveMap = React.useCallback((data: { map: MapEntity }) => {
    /**
     * Load new map
     */
    currentMapRef.current = data.map;

    const mapImageUrl = buildApiUrl(
      // prettier-ignore
      `/map/${data.map.id}/map?authorization=${encodeURIComponent(props.password)}`
    );

    const fogImageUrl = buildApiUrl(
      // prettier-ignore
      `/map/${data.map.id}/fog?cache_buster=${createCacheBusterString()}&authorization=${encodeURIComponent(props.password)}`
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
      })
      .catch(() => {
        console.log("Cancel loading image.");
      });
  }, []);

  React.useEffect(() => {
    onReceiveMap({ map: props.map });

    return () => {
      if (pendingFogImageLoad.current) {
        pendingFogImageLoad.current?.();
        pendingFogImageLoad.current = null;
      }
    };
  }, [props.password, props.map.id]);

  // TODO: this should be persisted state
  const [activeTool, setActiveTool] = React.useState<null | MapTool<any, any>>(
    DM_TOOL_MAP[0].tool
  );

  const isCurrentMapLive =
    props.map.id !== null && props.map.id === props.liveMapId;
  const isOtherMapLive = props.liveMapId !== null;

  const { addToast } = useToasts();
  const asyncClipBoardApi = useAsyncClipboardApi();

  const copyMapToClipboard = () => {
    if (!controlRef.current) {
      return;
    }
    const context = controlRef.current.getContext();
    const mapCanvas = context.mapCanvas;
    const fogCanvas = context.fogCanvas;

    if (asyncClipBoardApi) {
      const canvas = new OffscreenCanvas(mapCanvas.width, mapCanvas.height);
      const context = canvas.getContext("2d")!;
      context.drawImage(mapCanvas, 0, 0);
      context.drawImage(fogCanvas, 0, 0);

      const { clipboard, ClipboardItem } = asyncClipBoardApi;
      canvas.convertToBlob().then((blob) => {
        clipboard
          .write([
            new ClipboardItem({
              [blob.type]: blob,
            }),
          ])
          .then(() => {
            addToast(`Copied map image to clipboard.`, {
              appearance: "success",
              autoDismiss: true,
            });
          })
          .catch(console.error);
      });
    } else {
      // In case we don't have the AsyncClipboard available we need to use a normal canvas in order to get the base64 string.
      // The OffscreenCanvas has no `toDataURL` method.
      const canvas = document.createElement("canvas");
      canvas.width = mapCanvas.width;
      canvas.height = mapCanvas.height;

      const context = canvas.getContext("2d")!;
      context.drawImage(mapCanvas, 0, 0);
      context.drawImage(fogCanvas, 0, 0);

      const dataUri = canvas.toDataURL("image/png");
      window.open(dataUri, "_blank");
    }
  };

  const isAltPressed = useIsKeyPressed("Alt");

  React.useEffect(() => {
    const listener = (ev: KeyboardEvent) => {
      switch (ev.key) {
        case "1":
        case "2":
        case "3":
        case "4": {
          const toolIndex = parseInt(ev.key, 10) - 1;
          setActiveTool(DM_TOOL_MAP[toolIndex].tool);
          break;
        }
      }
    };
    window.document.addEventListener("keypress", listener);

    return () => window.document.removeEventListener("keypress", listener);
  }, []);

  const [confirmDialogNode, showDialog] = useConfirmationDialog();

  return (
    <MarkAreaToolContext.Provider value={{ onMarkArea: props.markArea }}>
      <BrushToolContextProvider
        onDrawEnd={(canvas) => {
          // TODO: toggle between instant send and incremental send
          props.saveFogProgress(canvas);
        }}
      >
        {mapImage ? (
          <MapView
            activeTool={isAltPressed ? DragPanZoomMapTool : activeTool}
            mapImage={mapImage}
            fogImage={fogImage}
            controlRef={controlRef}
            tokens={props.map.tokens}
            updateTokenPosition={(id, position) => {
              props.updateToken({ id, ...position });
            }}
            markedAreas={props.markedAreas}
            removeMarkedArea={props.removeMarkedArea}
            grid={
              props.map.grid && props.map.showGridToPlayers
                ? {
                    x: props.map.grid.x,
                    y: props.map.grid.y,
                    sideLength: props.map.grid.sideLength,
                    color: props.map.gridColor || "red",
                  }
                : null
            }
            sharedContexts={DM_TOOL_MAP.map((record) => record.tool.Context)}
            fogOpacity={0.5}
          />
        ) : null}
        <LeftToolbarContainer>
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
            <Toolbar.Group divider>
              <Toolbar.Item isActive>
                <Toolbar.Button
                  onClick={() =>
                    showDialog({
                      header: "Shroud All",
                      body: "Do you really want to shroud the whole map?",
                      onConfirm: () => {
                        // TODO: this should be less verbose
                        const context = controlRef.current?.getContext();
                        if (!context) {
                          return;
                        }
                        const canvasContext = context.fogCanvas.getContext(
                          "2d"
                        )!;
                        applyFogRectangle(
                          FogMode.shroud,
                          [0, 0],
                          [context.fogCanvas.width, context.fogCanvas.height],
                          canvasContext
                        );
                        context.fogTexture.needsUpdate = true;
                      },
                    })
                  }
                >
                  <Icons.DropletIcon fill size={20} />
                  <Icons.Label>Shroud All</Icons.Label>
                </Toolbar.Button>
              </Toolbar.Item>
              <Toolbar.Item isActive>
                <Toolbar.Button
                  onClick={() =>
                    showDialog({
                      header: "Clear All",
                      body: "Do you really want to clear the whole map?",
                      onConfirm: () => {
                        // TODO: this should be less verbose
                        const context = controlRef.current?.getContext();
                        if (!context) {
                          return;
                        }
                        const canvasContext = context.fogCanvas.getContext(
                          "2d"
                        )!;
                        applyFogRectangle(
                          FogMode.clear,
                          [0, 0],
                          [context.fogCanvas.width, context.fogCanvas.height],
                          canvasContext
                        );
                        context.fogTexture.needsUpdate = true;
                      },
                    })
                  }
                >
                  <Icons.DropletIcon size={20} />
                  <Icons.Label>Clear All</Icons.Label>
                </Toolbar.Button>
              </Toolbar.Item>
            </Toolbar.Group>
          </Toolbar>
        </LeftToolbarContainer>
        <BottomToolbarContainer>
          <Toolbar horizontal>
            <Toolbar.Group>
              <Toolbar.Item isActive={null != props.map.grid}>
                <Toolbar.Button
                  onClick={() => {
                    if (!props.map.grid) {
                      props.enterGridMode();
                    } else {
                      // setShowGridSettings(
                      //   (showGridSettings) => !showGridSettings
                      // );
                    }
                  }}
                >
                  <Icons.GridIcon size={20} />
                  <Icons.Label>
                    {props.map.grid != null ? "Grid Settings" : "Add Grid"}
                  </Icons.Label>
                </Toolbar.Button>
                {/* {showGridSettings ? (
                <ShowGridSettingsPopup
                  gridColor={gridColor}
                  setGridColor={setGridColor}
                  showGrid={map.showGrid}
                  setShowGrid={(showGrid) => {
                    updateMap(map.id, { showGrid });
                  }}
                  showGridToPlayers={map.showGridToPlayers}
                  setShowGridToPlayers={(showGridToPlayers) => {
                    updateMap(map.id, { showGridToPlayers });
                  }}
                  onGridColorChangeComplete={onGridColorChangeComplete}
                  onClickOutside={() => {
                    setShowGridSettings(false);
                  }}
                />
              ) : null} */}
              </Toolbar.Item>
              <Toolbar.Item isActive>
                <Toolbar.Button
                  onClick={() => {
                    props.showMapModal();
                  }}
                >
                  <Icons.MapIcon size={20} />
                  <Icons.Label>Map Library</Icons.Label>
                </Toolbar.Button>
              </Toolbar.Item>
              <Toolbar.Item isActive>
                <Toolbar.Button
                  onClick={() => {
                    props.openMediaLibrary();
                  }}
                >
                  <Icons.ImageIcon size={20} />
                  <Icons.Label>Media Library</Icons.Label>
                </Toolbar.Button>
              </Toolbar.Item>
              <Toolbar.Item isActive>
                <Toolbar.Button
                  onClick={() => {
                    props.openNotes();
                  }}
                >
                  <Icons.BookOpen size={20} />
                  <Icons.Label>Notes</Icons.Label>
                </Toolbar.Button>
              </Toolbar.Item>
            </Toolbar.Group>
          </Toolbar>
          <div style={{ marginLeft: 24 }} />
          <Toolbar horizontal>
            <Toolbar.Group>
              <Toolbar.Item>
                <ConditionalWrap
                  condition={props.liveMapId !== null}
                  wrap={(children) => (
                    <Toolbar.Button onClick={props.hideMap}>
                      {children}
                    </Toolbar.Button>
                  )}
                >
                  <Icons.PauseIcon
                    color={
                      props.liveMapId !== null
                        ? "hsl(360, 83%, 62%)"
                        : "hsl(211, 27%, 70%)"
                    }
                    size={20}
                  />
                  <Icons.Label
                    color={
                      props.liveMapId !== null
                        ? "hsl(360, 83%, 62%)"
                        : "hsl(211, 27%, 70%)"
                    }
                  >
                    Stop Sharing
                  </Icons.Label>
                </ConditionalWrap>
              </Toolbar.Item>
              {isCurrentMapLive ? (
                <Toolbar.Item>
                  <Icons.RadioIcon color="hsl(160, 51%, 49%)" size={20} />
                  <Icons.Label color="hsl(160, 51%, 49%)">Live</Icons.Label>
                </Toolbar.Item>
              ) : isOtherMapLive ? (
                <Toolbar.Item>
                  <Icons.RadioIcon color="hsl(48, 94%, 68%)" size={20} />
                  <Icons.Label color="hsl(48, 94%, 68%)">Live</Icons.Label>
                </Toolbar.Item>
              ) : (
                <Toolbar.Item>
                  <Icons.RadioIcon color="hsl(211, 27%, 70%)" size={20} />
                  <Icons.Label color="hsl(211, 27%, 70%)">Not Live</Icons.Label>
                </Toolbar.Item>
              )}
              <Toolbar.Item isActive>
                <Toolbar.Button onClick={copyMapToClipboard}>
                  <Icons.ClipboardIcon size={20} />
                  <Icons.Label>Clipboard</Icons.Label>
                </Toolbar.Button>
              </Toolbar.Item>
              <Toolbar.Item isActive>
                <Toolbar.Button
                  onClick={() => {
                    const context = controlRef.current?.getContext();
                    if (!context) {
                      return;
                    }
                    props.sendLiveMap(context.fogCanvas);
                  }}
                >
                  <Icons.SendIcon size={20} />
                  <Icons.Label>Send</Icons.Label>
                </Toolbar.Button>
              </Toolbar.Item>
            </Toolbar.Group>
          </Toolbar>
        </BottomToolbarContainer>
        {confirmDialogNode}
      </BrushToolContextProvider>
    </MarkAreaToolContext.Provider>
  );
};

const LeftToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  position: absolute;
  height: 100%;
  top: 0;
  left: 12px;
  pointer-events: none;
`;

const BottomToolbarContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  position: absolute;
  bottom: 12px;
  pointer-events: none;
`;

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
