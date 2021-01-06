import * as React from "react";
import { v4 as uuid } from "uuid";
import styled from "@emotion/styled/macro";
import { useToasts } from "react-toast-notifications";
import { CirclePicker } from "react-color";
import * as io from "io-ts";
import { pipe, identity } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
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
import {
  AreaSelectContext,
  AreaSelectContextProvider,
  AreaSelectMapTool,
} from "../map-tools/area-select-map-tool";
import { useOnClickOutside } from "../hooks/use-on-click-outside";
import { useAsyncClipboardApi } from "../hooks/use-async-clipboard-api";
import { MapEntity, MapTokenEntity, MarkedAreaEntity } from "../map-typings";
import { useConfirmationDialog } from "../hooks/use-confirmation-dialog";
import { applyFogRectangle } from "../canvas-draw-utilities";
import { MapGridEntity } from "../map-typings";
import { useResetState } from "../hooks/use-reset-state";
import * as Button from "../button";
import { useDebounceCallback } from "../hooks/use-debounce-callback";
import {
  FlatContextProvider,
  ComponentWithPropsTuple,
} from "../flat-context-provider";
import { TokenContextMenuContext } from "../token-context-menu-context";
import { TokenContextRenderer } from "../token-context-menu";
import {
  PersistedStateModel,
  usePersistedState,
} from "../hooks/use-persisted-state";
import {
  TokenMarkerContext,
  TokenMarkerContextProvider,
  TokenMarkerMapTool,
} from "../map-tools/token-marker-map-tool";
import { NoteWindowActionsContext } from "./token-info-aside";
import { Input as OldInput, InputGroup as OldInputGroup } from "../input";
import { parseNumberSafe } from "../parse-number-safe";
import { ColorPickerInput } from "../color-picker-input";
import {
  Box,
  FormControl,
  FormLabel,
  Heading,
  Switch,
  VStack,
  HStack,
  Text,
  InputGroup,
  Stack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Input,
} from "@chakra-ui/react";

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

const AreaSelectSettings = (): React.ReactElement => {
  const { state, setState } = React.useContext(AreaSelectContext);

  return (
    <div>
      <h6 style={{ margin: 0, marginBottom: 12 }}>Snap to grid</h6>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Switch
          isChecked={state.snapToGrid}
          onChange={(ev) => {
            const snapToGrid = ev.target.checked;
            setState((state) => ({ ...state, snapToGrid }));
          }}
        />
        <span style={{ fontWeight: "bold", marginLeft: 8 }}>
          {state.snapToGrid ? "On" : "Off"}
        </span>
      </div>
    </div>
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

const ShowGridSettingsPopup = React.memo(
  (props: {
    grid: MapGridEntity;
    showGrid: boolean;
    showGridToPlayers: boolean;
    updateMap: (params: Partial<MapEntity>) => void;
    enterConfigureGridMode: () => void;
  }) => {
    const [gridColor, setGridColor] = useResetState(() => props.grid.color, []);
    const [showGrid, setShowGrid] = useResetState(props.showGrid, []);
    const [showGridToPlayers, setShowGridToPlayers] = useResetState(
      props.showGridToPlayers,
      []
    );

    const syncState = useDebounceCallback(() => {
      props.updateMap({
        showGrid,
        showGridToPlayers,
        grid: {
          ...props.grid,
          color: gridColor,
        },
      });
    }, 300);

    return (
      <Toolbar.Popup>
        <VStack minWidth="300px">
          <HStack width="100%" justifyContent="space-between">
            <Box>
              <Heading size="xs">Grid Settings</Heading>
            </Box>

            <Box>
              <Button.Tertiary small onClick={props.enterConfigureGridMode}>
                <span>Edit Grid </span>
                <Icons.SettingsIcon size={12} />
              </Button.Tertiary>
            </Box>
          </HStack>

          <FormControl
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <FormLabel htmlFor="show-grid-toggle">Show Grid</FormLabel>
            <Switch
              id="show-grid-toggle"
              size="lg"
              isChecked={showGrid}
              onChange={(ev) => {
                setShowGrid(ev.target.checked);
                syncState();
              }}
            />
          </FormControl>
          <FormControl
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <FormLabel htmlFor="show-grid-to-players-toggle">
              Show Grid to players
            </FormLabel>
            <Switch
              id="show-grid-to-players-toggle"
              size="lg"
              isChecked={showGridToPlayers}
              onChange={(ev) => {
                setShowGridToPlayers(ev.target.checked);
                syncState();
              }}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Color</FormLabel>
            <ColorPickerInput
              color={gridColor}
              onChange={(color) => {
                setGridColor(color);
                syncState();
              }}
            />
          </FormControl>
        </VStack>
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
  const ref = React.useRef<null | HTMLLIElement>(null);
  useOnClickOutside<HTMLLIElement>(ref, () => {
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

const TokenMarkerSettings = (): React.ReactElement => {
  const tokenMarkerContext = React.useContext(TokenMarkerContext);
  const configureGridContext = React.useContext(ConfigureGridMapToolContext);

  const updateTokenRadius = (factor: number) => {
    tokenMarkerContext.setState((state) => ({
      ...state,
      tokenRadius: (configureGridContext.state.columnWidth / 2) * factor * 0.9,
    }));
  };

  return (
    <Stack
      onKeyPress={(ev) => {
        ev.stopPropagation();
      }}
    >
      <FormControl size="sm">
        <FormLabel>Radius</FormLabel>
        <Stack>
          <InputGroup size="sm">
            <NumberInput
              size="sm"
              value={tokenMarkerContext.state.tokenRadius}
              min={1}
              onChange={(valueString) => {
                let tokenRadius = parseFloat(valueString);
                if (Number.isNaN(tokenRadius)) {
                  tokenRadius = 1;
                }
                tokenMarkerContext.setState((state) => ({
                  ...state,
                  tokenRadius,
                }));
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </InputGroup>
          <HStack>
            <Button.Tertiary
              small
              onClick={() => {
                updateTokenRadius(0.25);
              }}
            >
              0.25x
            </Button.Tertiary>
            <Button.Tertiary
              small
              onClick={() => {
                updateTokenRadius(0.5);
              }}
            >
              0.5x
            </Button.Tertiary>
            <Button.Tertiary
              small
              onClick={() => {
                updateTokenRadius(1);
              }}
            >
              1x
            </Button.Tertiary>
            <Button.Tertiary
              small
              onClick={() => {
                updateTokenRadius(2);
              }}
            >
              2x
            </Button.Tertiary>
            <Button.Tertiary
              small
              onClick={() => {
                updateTokenRadius(3);
              }}
            >
              3x
            </Button.Tertiary>
          </HStack>
        </Stack>
      </FormControl>
      <FormControl size="sm">
        <FormLabel>Color</FormLabel>
        <Stack>
          <ColorPickerInput
            size="sm"
            color={tokenMarkerContext.state.tokenColor}
            disableAlpha={true}
            onChange={(color) => {
              tokenMarkerContext.setState((state) => ({
                ...state,
                tokenColor: color,
              }));
            }}
          />
          <ColorPicker
            color={tokenMarkerContext.state.tokenColor}
            onChange={(color) => {
              tokenMarkerContext.setState((state) => ({
                ...state,
                tokenColor: color,
              }));
            }}
          />
        </Stack>
      </FormControl>
      <FormControl size="sm">
        <FormLabel>Label</FormLabel>
        <Input
          size="sm"
          type="text"
          value={tokenMarkerContext.state.tokenText}
          onChange={(ev) => {
            const tokenText = ev.target.value;
            tokenMarkerContext.setState((state) => ({
              ...state,
              tokenText,
            }));
          }}
        />
      </FormControl>
      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="switch-include-token-counter" mb="0">
          Append Counter
        </FormLabel>
        <Switch
          id="switch-include-token-counter"
          isChecked={tokenMarkerContext.state.includeTokenCounter}
          onChange={(ev) => {
            const includeTokenCounter = ev.target.checked;
            tokenMarkerContext.setState((state) => ({
              ...state,
              includeTokenCounter,
            }));
          }}
        />
      </FormControl>
      {tokenMarkerContext.state.includeTokenCounter ? (
        <FormControl size="sm">
          <InputGroup size="sm">
            <NumberInput
              value={tokenMarkerContext.state.tokenCounter}
              min={1}
              onChange={(valueString) => {
                let tokenCounter = parseFloat(valueString);
                if (Number.isNaN(tokenCounter)) {
                  tokenCounter = 1;
                }
                tokenMarkerContext.setState((state) => ({
                  ...state,
                  tokenCounter,
                }));
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </InputGroup>
        </FormControl>
      ) : null}
    </Stack>
  );
};

const OldNumberInput = (props: {
  disabled?: boolean;
  value: number;
  onChange: (value: number) => void;
}): React.ReactElement => {
  const [value, setValue] = useResetState(() => String(props.value), [
    props.value,
  ]);

  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current == true) {
      isFirstRender.current = false;
      return;
    }
    const parsedNumber = parseNumberSafe(value);
    if (parsedNumber !== null) {
      props.onChange(parsedNumber);
    }
  }, [value]);

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ flex: 1, marginRight: 4 }}>
        <OldInput
          disabled={props.disabled}
          value={value}
          onChange={(ev) => {
            setValue(ev.target.value);
          }}
        />
      </div>
      <div style={{ flexShrink: 0 }}>
        <label>
          <Button.Tertiary
            small
            onClick={() => {
              setValue("1");
            }}
          >
            <Icons.RotateCCW size={20} />
            <span>Reset counter</span>
          </Button.Tertiary>
        </label>
      </div>
    </div>
  );
};

const ColorPicker = React.memo(
  (props: { color: string; onChange: (color: string) => void }) => {
    return (
      <CirclePicker
        color={props.color}
        onChangeComplete={(color) => props.onChange(color.hex)}
      />
    );
  }
);

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
    MenuComponent: AreaSelectSettings,
  },
  {
    name: "Mark",
    icon: <Icons.CrosshairIcon size={20} />,
    tool: MarkAreaMapTool,
    MenuComponent: null,
  },
  {
    name: "Token",
    icon: <Icons.TargetIcon size={20} />,
    tool: TokenMarkerMapTool,
    MenuComponent: TokenMarkerSettings,
  },
];

const ActiveDmMapToolModel = io.union([
  io.literal(DragPanZoomMapTool.id),
  io.literal(MarkAreaMapTool.id),
  io.literal(BrushMapTool.id),
  io.literal(AreaSelectMapTool.id),
  io.literal(MarkAreaMapTool.id),
  io.literal(TokenMarkerMapTool.id),
]);

const activeDmMapToolIdModel: PersistedStateModel<
  io.TypeOf<typeof ActiveDmMapToolModel>
> = {
  encode: identity,
  decode: (value) =>
    pipe(
      ActiveDmMapToolModel.decode(value),
      E.fold((err) => {
        if (value !== null) {
          console.log(
            "Error occured while trying to decode value.\n" +
              JSON.stringify(err, null, 2)
          );
        }
        return DragPanZoomMapTool.id;
      }, identity)
    ),
};

const createCacheBusterString = () =>
  encodeURIComponent(`${Date.now()}_${uuid()}`);

export const DmMap = (props: {
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
  addToken: (token: {
    x: number;
    y: number;
    color: string;
    radius: number;
    label: string;
  }) => void;
  updateToken: (
    id: string,
    changes: Omit<Partial<MapTokenEntity>, "id">
  ) => void;
  deleteToken: (id: string) => void;
  updateMap: (params: Partial<MapEntity>) => void;
}): React.ReactElement => {
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

    Promise.all([
      loadMapImageTask.promise,
      loadFogImageTask.promise.catch(() => null),
    ])
      .then(([mapImage, fogImage]) => {
        mapImage.id = createCacheBusterString();
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

  const [activeToolId, setActiveToolId] = usePersistedState(
    "activeDmTool",
    activeDmMapToolIdModel
  );

  const userSelectedTool = React.useMemo(() => {
    return (
      DM_TOOL_MAP.find((tool) => tool.tool.id === activeToolId) ??
      DM_TOOL_MAP[0]
    ).tool;
  }, [activeToolId]);

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
        case "4":
        case "5": {
          const toolIndex = parseInt(ev.key, 10) - 1;
          setActiveToolId(DM_TOOL_MAP[toolIndex].tool.id);
          break;
        }
        case "s": {
          /**
           * overwrite CMD + S
           * @source: https://michilehr.de/overwrite-cmds-and-ctrls-in-javascript/
           */
          if (
            window.navigator.platform.match("Mac") ? ev.metaKey : ev.ctrlKey
          ) {
            ev.preventDefault();
            const context = controlRef.current?.getContext();
            if (!context) {
              return;
            }
            props.sendLiveMap(context.fogCanvas);
          }
          break;
        }
      }
    };
    window.document.addEventListener("keydown", listener);

    return () => window.document.removeEventListener("keydown", listener);
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
        [AreaSelectContextProvider, {}],
        [
          TokenMarkerContextProvider,
          {
            addToken: props.addToken,
          },
        ] as ComponentWithPropsTuple<
          React.ComponentProps<typeof TokenMarkerContextProvider>
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
            AreaSelectContext,
            TokenMarkerContext,
            NoteWindowActionsContext,
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
                      setActiveToolId(record.tool.id);
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
  const ref = React.useRef<null | HTMLLIElement>(null);
  useOnClickOutside<HTMLLIElement>(ref, () => {
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

const GridConfigurator = (props: {
  onAbort: () => void;
  onConfirm: (grid: MapGridEntity) => void;
}): React.ReactElement => {
  const { state, setState } = React.useContext(ConfigureGridMapToolContext);

  return (
    <Stack
      position="absolute"
      bottom="12px"
      right="12px"
      width="100%"
      maxWidth="500px"
      borderRadius="12px"
      padding="2"
      backgroundColor="white"
    >
      <Heading size="lg">Grid Configurator</Heading>
      <Text>
        Press and hold <strong>Alt</strong> for dragging the grid with your
        mouse.
      </Text>
      <HStack>
        <FormControl>
          <FormLabel>X-Coordinate</FormLabel>
          <InputGroup size="sm">
            <NumberInput
              value={state.offsetX}
              onChange={(valueString) => {
                let offsetX = parseFloat(valueString);
                if (Number.isNaN(offsetX)) {
                  offsetX = 0;
                }
                setState((state) => ({
                  ...state,
                  offsetX,
                }));
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </InputGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Y-Coordinate</FormLabel>
          <InputGroup size="sm">
            <NumberInput
              value={state.offsetY}
              onChange={(valueString) => {
                let offsetY = parseFloat(valueString);
                if (Number.isNaN(offsetY)) {
                  offsetY = 0;
                }
                setState((state) => ({
                  ...state,
                  offsetY,
                }));
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </InputGroup>
        </FormControl>
      </HStack>
      <HStack>
        <FormControl>
          <FormLabel>Column Width</FormLabel>
          <InputGroup size="sm">
            <NumberInput
              value={state.columnWidth}
              onChange={(valueString) => {
                let columnWidth = parseFloat(valueString);
                if (Number.isNaN(columnWidth)) {
                  columnWidth = 0;
                }
                setState((state) => ({
                  ...state,
                  columnWidth,
                }));
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </InputGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Column Height</FormLabel>
          <InputGroup size="sm">
            <NumberInput
              value={state.columnHeight}
              onChange={(valueString) => {
                let columnHeight = parseFloat(valueString);
                if (Number.isNaN(columnHeight)) {
                  columnHeight = 0;
                }
                setState((state) => ({
                  ...state,
                  columnHeight,
                }));
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </InputGroup>
        </FormControl>
      </HStack>

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
    </Stack>
  );
};
