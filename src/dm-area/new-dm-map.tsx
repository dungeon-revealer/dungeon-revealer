import * as React from "react";
import { v4 as uuid } from "uuid";
import styled from "@emotion/styled/macro";
import { useToasts } from "react-toast-notifications";
import { AlphaPicker, HuePicker } from "react-color";
import { parseToRgb, toColorString } from "polished";
import * as Icons from "../feather-icons";
import { Toolbar } from "../toolbar";
import type { MapTool } from "../map-tools/map-tool";
import { DragPanZoomMapTool } from "../map-tools/drag-pan-zoom-map-tool";
import {
  BrushMapTool,
  BrushToolContext,
  BrushToolContextProvider,
} from "../map-tools/brush-map-tool";
import {
  MarkAreaMapTool,
  MarkAreaToolContext,
} from "../map-tools/mark-area-map-tool";
import {
  ConfigureGridMapTool,
  ConfigureGridMapToolContext,
  ConfigureMapToolState,
} from "../map-tools/configure-grid-map-tool";
import { MapView, MapControlInterface } from "../map-view";
import { buildApiUrl } from "../public-url";
import { ConditionalWrap, loadImage } from "../util";
import { BrushShape, FogMode } from "../canvas-draw-utilities";
import { AreaSelectMapTool } from "../map-tools/area-select-map-tool";
import { useOnClickOutside } from "../hooks/use-on-click-outside";
import { useIsKeyPressed } from "../hooks/use-is-key-pressed";
import { useAsyncClipboardApi } from "../hooks/use-async-clipboard-api";
import { MapEntity, MapTokenEntity, MarkedAreaEntity } from "../map-typings";
import { useConfirmationDialog } from "../hooks/use-confirmation-dialog";
import { applyFogRectangle } from "../canvas-draw-utilities";
import { ToggleSwitch } from "../toggle-switch";
import { MapGridEntity } from "../map-typings";
import { useResetState } from "../hooks/use-reset-state";
import { Input } from "../input";
import * as Button from "../button";
import { useLongPress } from "../hooks/use-long-press";
import { parseNumberSafe } from "../parse-number-safe";
import { useDebounceCallback } from "../hooks/use-debounce-callback";
import {
  FlatContextProvider,
  ComponentWithPropsTuple,
} from "../flat-context-provider";
import { TokenContextMenuContext } from "../token-context-menu-context";
import { TokenContextRenderer } from "../token-context-menu";

type ToolMapRecord = {
  name: string;
  icon: React.ReactElement;
  tool: MapTool;
  MenuComponent: null | (() => React.ReactElement);
};

const BrushSettings = (): React.ReactElement => {
  const { state, setState } = React.useContext(BrushToolContext);

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
  const { state, setState } = React.useContext(BrushToolContext);
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

const parseMapColor = (
  input: string
): {
  r: number;
  g: number;
  b: number;
  a: number;
} => {
  // @ts-ignore
  const { red, green, blue, alpha = 1 } = parseToRgb(input);
  return {
    r: red,
    g: green,
    b: blue,
    a: alpha,
  };
};

const ShowGridSettingsPopup = React.memo(
  (props: {
    grid: MapGridEntity;
    showGrid: boolean;
    showGridToPlayers: boolean;
    updateMap: (params: Partial<MapEntity>) => void;
    enterConfigureGridMode: () => void;
  }) => {
    const [gridColor, setGridColor] = useResetState(() =>
      parseMapColor(props.grid.color)
    );
    const [showGrid, setShowGrid] = useResetState(props.showGrid, [
      props.showGrid,
    ]);
    const [
      showGridToPlayers,
      setShowGridToPlayers,
    ] = useResetState(props.showGridToPlayers, [props.showGridToPlayers]);

    const syncState = useDebounceCallback(() => {
      props.updateMap({
        showGrid,
        showGridToPlayers,
        grid: {
          ...props.grid,
          color: toColorString({
            red: gridColor.r,
            green: gridColor.g,
            blue: gridColor.b,
            alpha: gridColor.a,
          }),
        },
      });
    }, 300);

    return (
      <Toolbar.Popup>
        <div style={{ display: "flex" }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ textAlign: "left", marginTop: 8 }}>Grid Settings</h4>
          </div>
          <div>
            <Button.Tertiary small onClick={props.enterConfigureGridMode}>
              <span>Edit Grid </span>
              <Icons.SettingsIcon size={12} />
            </Button.Tertiary>
          </div>
        </div>

        <div>
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ flexGrow: 1 }}>Show Grid</div>
              <div style={{ marginLeft: 8 }}>
                <ToggleSwitch
                  checked={showGrid}
                  onChange={(checked) => {
                    setShowGrid(checked);
                    syncState();
                  }}
                />
              </div>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                textAlign: "left",
                marginTop: 8,
                cursor: "pointer",
              }}
            >
              <div style={{ flexGrow: 1 }}>Show Grid to Players</div>
              <div style={{ marginLeft: 8 }}>
                <ToggleSwitch
                  checked={showGridToPlayers}
                  onChange={(checked) => {
                    setShowGridToPlayers(checked);
                    syncState();
                  }}
                />
              </div>
            </label>
          </div>
          <div style={{ marginTop: 16, marginBottom: 8 }}>
            <HuePicker
              color={gridColor}
              onChange={(color) => {
                setGridColor({ ...color.rgb, a: color.rgb.a ?? 1 });
              }}
              onChangeComplete={syncState}
            />
            <div style={{ height: 16 }} />
            <AlphaPicker
              color={gridColor}
              onChange={(color) => {
                setGridColor({ ...color.rgb, a: color.rgb.a ?? 1 });
              }}
              onChangeComplete={syncState}
            />
          </div>
        </div>
      </Toolbar.Popup>
    );
  }
);

const GridSettingButton = (props: {
  enterConfigureGridMode: () => void;
  map: MapEntity;
  updateMap: (params: Partial<MapEntity>) => void;
}): React.ReactElement => {
  const [showMenu, setShowMenu] = React.useState(false);
  const ref = useOnClickOutside<HTMLLIElement>(() => {
    setShowMenu(false);
  });

  const [dialogNode, showDialog] = useConfirmationDialog();

  return (
    <Toolbar.Item isActive={props.map.grid != null} ref={ref}>
      <Toolbar.Button
        onClick={() => {
          if (!props.map.grid) {
            showDialog({
              header: "Configure Grid",
              body:
                "This map currently has no grid data. Do you wanna add a new grid using the grid configurator?",
              onConfirm: props.enterConfigureGridMode,
              confirmButtonText: "Add Grid",
            });
          } else {
            setShowMenu((showMenu) => !showMenu);
          }
        }}
      >
        <Icons.GridIcon size={20} />
        <Icons.Label>Grid</Icons.Label>
      </Toolbar.Button>
      {showMenu && props.map.grid ? (
        <ShowGridSettingsPopup
          grid={props.map.grid}
          showGrid={props.map.showGrid}
          showGridToPlayers={props.map.showGridToPlayers}
          updateMap={props.updateMap}
          enterConfigureGridMode={props.enterConfigureGridMode}
        />
      ) : null}
      {dialogNode}
    </Toolbar.Item>
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
  sendLiveMap: (image: HTMLCanvasElement) => void;
  saveFogProgress: (image: HTMLCanvasElement) => void;
  markArea: (point: [number, number]) => void;
  markedAreas: Array<MarkedAreaEntity>;
  removeMarkedArea: (id: string) => void;
  updateToken: (
    id: string,
    changes: Omit<Partial<MapTokenEntity>, "id">
  ) => void;
  deleteToken: (id: string) => void;
  updateMap: (params: Partial<MapEntity>) => void;
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
  const [
    userSelectedTool,
    setUserSelectedTool,
  ] = React.useState<null | MapTool>(DM_TOOL_MAP[0].tool);
  const [toolOverride, setToolOverride] = React.useState<null | MapTool>(null);
  const activeTool = toolOverride ?? userSelectedTool;

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

  const isConfiguringGrid = userSelectedTool === ConfigureGridMapTool;
  const isConfiguringGridRef = React.useRef(isConfiguringGrid);
  React.useEffect(() => {
    isConfiguringGridRef.current = isConfiguringGrid;
  });

  React.useEffect(() => {
    const listener = (ev: KeyboardEvent) => {
      if (isConfiguringGridRef.current) {
        return;
      }
      switch (ev.key) {
        case "1":
        case "2":
        case "3":
        case "4": {
          const toolIndex = parseInt(ev.key, 10) - 1;
          setUserSelectedTool(DM_TOOL_MAP[toolIndex].tool);
          break;
        }
      }
    };
    window.document.addEventListener("keypress", listener);

    return () => window.document.removeEventListener("keypress", listener);
  }, []);

  const [confirmDialogNode, showDialog] = useConfirmationDialog();

  const [
    configureGridMapToolState,
    setConfigureGridMapToolState,
  ] = useResetState<ConfigureMapToolState>(
    () => ({
      offsetX: props.map.grid?.offsetX ?? 0,
      offsetY: props.map.grid?.offsetY ?? 0,
      columnWidth: props.map.grid?.columnWidth ?? 50,
      columnHeight: props.map.grid?.columnHeight ?? 50,
    }),
    [props.map.grid]
  );

  return (
    <FlatContextProvider
      value={[
        [
          MarkAreaToolContext.Provider,
          { value: { onMarkArea: props.markArea } },
        ] as ComponentWithPropsTuple<
          React.ComponentProps<typeof MarkAreaToolContext.Provider>
        >,
        [
          BrushToolContextProvider,
          {
            onDrawEnd: (canvas) => {
              // TODO: toggle between instant send and incremental send
              props.saveFogProgress(canvas);
            },
          },
        ] as ComponentWithPropsTuple<
          React.ComponentProps<typeof BrushToolContextProvider>
        >,
        [
          ConfigureGridMapToolContext.Provider,
          {
            value: {
              state: configureGridMapToolState,
              setState: setConfigureGridMapToolState,
            },
          },
        ] as ComponentWithPropsTuple<
          React.ComponentProps<typeof ConfigureGridMapToolContext.Provider>
        >,
        [
          TokenContextRenderer,
          {
            updateToken: props.updateToken,
            deleteToken: props.deleteToken,
            children: null,
            tokens: props.map.tokens,
          },
        ] as ComponentWithPropsTuple<
          React.ComponentProps<typeof TokenContextRenderer>
        >,
      ]}
    >
      {mapImage ? (
        <MapView
          activeTool={activeTool}
          mapImage={mapImage}
          fogImage={fogImage}
          controlRef={controlRef}
          tokens={props.map.tokens}
          updateTokenPosition={(id, position) => {
            props.updateToken(id, position);
          }}
          markedAreas={props.markedAreas}
          removeMarkedArea={props.removeMarkedArea}
          grid={
            props.map.grid &&
            props.map.showGrid &&
            activeTool !== ConfigureGridMapTool
              ? props.map.grid
              : null
          }
          sharedContexts={[
            MarkAreaToolContext,
            BrushToolContext,
            ConfigureGridMapToolContext,
            TokenContextMenuContext,
          ]}
          fogOpacity={0.5}
        />
      ) : null}
      {toolOverride !== ConfigureGridMapTool ? (
        <>
          <LeftToolbarContainer>
            <Toolbar>
              <Toolbar.Logo />
              <Toolbar.Group divider>
                {DM_TOOL_MAP.map((record) => (
                  <MenuItemRenderer
                    key={record.tool.id}
                    record={record}
                    isActive={record.tool === userSelectedTool}
                    setActiveTool={() => {
                      setUserSelectedTool(record.tool);
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
                <GridSettingButton
                  enterConfigureGridMode={() => {
                    setToolOverride(ConfigureGridMapTool);
                  }}
                  map={props.map}
                  updateMap={props.updateMap}
                />
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
                    <Icons.Label color="hsl(211, 27%, 70%)">
                      Not Live
                    </Icons.Label>
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
        </>
      ) : (
        <GridConfigurator
          onAbort={() => {
            setToolOverride(null);
          }}
          onConfirm={(grid) => {
            props.updateMap({ grid });
            setToolOverride(null);
          }}
        />
      )}
      {confirmDialogNode}
    </FlatContextProvider>
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

const StepInput = (props: {
  label: string;
  value: number;
  onStepChangeValue: (increment: boolean) => void;
  onChangeValue: (value: number) => void;
}) => {
  const plusHandler = React.useCallback(() => {
    props.onStepChangeValue(true);
  }, [props.onStepChangeValue, props.value]);

  const minusHandler = React.useCallback(() => {
    props.onStepChangeValue(false);
  }, [props.onStepChangeValue, props.value]);

  const plusLongPressProps = useLongPress(() => {
    const interval = setInterval(plusHandler, 100);
    return () => clearInterval(interval);
  });

  const minusLongPressProps = useLongPress(() => {
    const interval = setInterval(minusHandler, 100);
    return () => clearInterval(interval);
  });

  const [localTextValue, setLocalTextValue] = useResetState(
    () => String(props.value),
    [props.value]
  );

  const syncLocalValue = useDebounceCallback(() => {
    const value = parseNumberSafe(localTextValue);
    if (value) {
      props.onChangeValue(value);
    }
  }, 500);

  return (
    <label>
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>{props.label}</div>
      <div style={{ display: "flex" }}>
        <div style={{ flexGrow: 1 }}>
          <Input
            value={localTextValue}
            onChange={(ev) => {
              setLocalTextValue(ev.target.value);
              syncLocalValue();
            }}
          />
        </div>
        <div>
          <Button.Tertiary {...plusLongPressProps} onClick={plusHandler} small>
            <Icons.PlusIcon />
          </Button.Tertiary>
        </div>
        <div>
          <Button.Tertiary
            {...minusLongPressProps}
            onClick={minusHandler}
            small
          >
            <Icons.MinusIcon />
          </Button.Tertiary>
        </div>
      </div>
    </label>
  );
};

const GridConfigurator = (props: {
  onAbort: () => void;
  onConfirm: (grid: MapGridEntity) => void;
}): React.ReactElement => {
  const { state, setState } = React.useContext(ConfigureGridMapToolContext);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        right: 12,
        width: "100%",
        background: "white",
        maxWidth: "500px",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <h1>Grid Configurator</h1>
      <p>
        Press and hold <strong>Alt</strong> for dragging the grid with your
        mouse.
      </p>
      <div style={{ display: "flex", marginTop: 16 }}>
        <div style={{ marginRight: 8, flex: 1 }}>
          <StepInput
            label="X-Coordinate"
            value={state.offsetX}
            onStepChangeValue={(increment) => {
              setState((state) => ({
                ...state,
                offsetX: state.offsetX + (increment ? 1 : -1),
              }));
            }}
            onChangeValue={(value) => {
              setState((state) => ({
                ...state,
                offsetX: value,
              }));
            }}
          />
        </div>
        <div style={{ marginLeft: 8, flex: 1 }}>
          <StepInput
            label="Y-Coordinate"
            value={state.offsetY}
            onStepChangeValue={(increment) => {
              setState((state) => ({
                ...state,
                offsetY: state.offsetY + (increment ? 1 : -1),
              }));
            }}
            onChangeValue={(value) => {
              setState((state) => ({
                ...state,
                offsetY: value,
              }));
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex" }}>
        <div style={{ marginRight: 8, flex: 1 }}>
          <StepInput
            label="Column Width"
            value={state.columnWidth}
            onStepChangeValue={(increment) => {
              setState((state) => ({
                ...state,
                columnWidth: state.columnWidth + (increment ? 1 : -1),
              }));
            }}
            onChangeValue={(value) => {
              setState((state) => ({
                ...state,
                columnWidth: value,
              }));
            }}
          />
        </div>
        <div style={{ marginLeft: 8, flex: 1 }}>
          <StepInput
            label="Column Height"
            value={state.columnHeight}
            onStepChangeValue={(increment) => {
              setState((state) => ({
                ...state,
                columnHeight: state.columnHeight + (increment ? 1 : -1),
              }));
            }}
            onChangeValue={(value) => {
              setState((state) => ({
                ...state,
                columnHeight: value,
              }));
            }}
          />
        </div>
      </div>
      <div
        style={{ display: "flex", marginTop: 16, justifyContent: "flex-end" }}
      >
        <div>
          <Button.Tertiary
            small
            style={{ marginRight: 16 }}
            onClick={props.onAbort}
            danger
          >
            <Icons.XIcon height={20} /> <span>Abort</span>
          </Button.Tertiary>
        </div>
        <div>
          <Button.Primary
            small
            onClick={() => {
              props.onConfirm({
                color: "red",
                columnWidth: state.columnWidth,
                columnHeight: state.columnHeight,
                offsetX: state.offsetX,
                offsetY: state.offsetY,
              });
            }}
          >
            <span>Confirm</span> <Icons.ChevronRightIcon height={20} />
          </Button.Primary>
        </div>
      </div>
    </div>
  );
};
