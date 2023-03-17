import * as React from "react";
import styled from "@emotion/styled/macro";
import * as io from "io-ts";
import { pipe, identity } from "fp-ts/function";
import * as E from "fp-ts/Either";
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
  useToast,
} from "@chakra-ui/react";
import graphql from "babel-plugin-relay/macro";
import { ReactRelayContext, useFragment, useMutation } from "relay-hooks";
import * as Icon from "../feather-icons";
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
import { MapControlInterface } from "../map-view";
import { ConditionalWrap } from "../util";
import { BrushShape, FogMode } from "../canvas-draw-utilities";
import {
  AreaSelectContext,
  AreaSelectContextProvider,
  AreaSelectMapTool,
} from "../map-tools/area-select-map-tool";
import { useOnClickOutside } from "../hooks/use-on-click-outside";
import { useAsyncClipboardApi } from "../hooks/use-async-clipboard-api";
import { MapTokenEntity } from "../map-typings";
import { useConfirmationDialog } from "../hooks/use-confirmation-dialog";
import { applyFogRectangle } from "../canvas-draw-utilities";
import { useResetState } from "../hooks/use-reset-state";
import * as Button from "../button";
import { useDebounceCallback } from "../hooks/use-debounce-callback";
import {
  FlatContextProvider,
  ComponentWithPropsTuple,
} from "../flat-context-provider";
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
import { ColorPickerInput } from "../color-picker-input";
import { buttonGroup, useControls, useCreateStore, LevaInputs } from "leva";
import { levaPluginIconPicker } from "../leva-plugin/leva-plugin-icon-picker";
import { ThemedLevaPanel } from "../themed-leva-panel";
import {
  ContextMenuStoreProvider,
  ContextMenuStoreContext,
} from "../map-context-menu";
import { ContextMenuRenderer } from "../map-context-menu-renderer";
import {
  SharedTokenStateProvider,
  SharedTokenStateStoreContext,
} from "../shared-token-state";
import { SharedTokenMenu } from "../shared-token-menu";
import { dmMap_DMMapFragment$key } from "./__generated__/dmMap_DMMapFragment.graphql";
import { dmMap_ShowGridSettingsPopupMapFragment$key } from "./__generated__/dmMap_ShowGridSettingsPopupMapFragment.graphql";
import { dmMap_ShowGridSettingsPopupGridFragment$key } from "./__generated__/dmMap_ShowGridSettingsPopupGridFragment.graphql";
import { dmMap_GridSettingButton_MapFragment$key } from "./__generated__/dmMap_GridSettingButton_MapFragment.graphql";
import { dmMap_mapUpdateGridMutation } from "./__generated__/dmMap_mapUpdateGridMutation.graphql";
import { dmMap_GridConfigurator_MapFragment$key } from "./__generated__/dmMap_GridConfigurator_MapFragment.graphql";
import { dmMap_MapPingMutation } from "./__generated__/dmMap_MapPingMutation.graphql";
import { UpdateTokenContext } from "../update-token-context";
import { IsDungeonMasterContext } from "../is-dungeon-master-context";
import { LazyLoadedMapView } from "../lazy-loaded-map-view";
import { RulerMapTool } from "../map-tools/ruler-map-tool";
import { mapView_GridRendererFragment$key } from "../__generated__/mapView_GridRendererFragment.graphql";

export type ToolMapRecord = {
  name: string;
  icon: React.ReactElement;
  tool: MapTool;
  MenuComponent: null | (() => React.ReactElement);
};

const BrushSettings = (): React.ReactElement => {
  const { state, setState } = React.useContext(BrushToolContext);

  const store = useCreateStore();
  useControls(
    () => ({
      brushSize: {
        type: LevaInputs.NUMBER,
        label: "Brush Size",
        value: state.brushSize.get(),
        onChange: (value, _, { initial }) => {
          if (initial) {
            return;
          }
          state.brushSize.set(value);
        },
        min: 1,
        max: 300,
        step: 1,
      },
      brushShape: levaPluginIconPicker({
        label: "Brush Shape",
        value: state.brushShape,
        options: [
          {
            value: BrushShape.square,
            icon: <Icon.Square boxSize="20px" />,
            label: "Square",
          },
          {
            value: BrushShape.circle,
            icon: <Icon.Circle boxSize="20px" />,
            label: "Circle",
          },
        ],
        onChange: (brushShape, _, { initial }) => {
          if (initial) {
            return;
          }
          setState((state) => ({
            ...state,
            brushShape,
          }));
        },
      }),
    }),
    { store },
    [state.brushShape]
  );

  return (
    <div
      onKeyDown={(ev) => {
        ev.stopPropagation();
      }}
    >
      <ThemedLevaPanel
        fill={true}
        titleBar={false}
        store={store}
        oneLineLabels
        hideCopyButton
      />
    </div>
  );
};

const AreaSelectSettings = (): React.ReactElement => {
  const { state, setState } = React.useContext(AreaSelectContext);

  const store = useCreateStore();
  useControls(
    () => ({
      snapToGrid: {
        type: LevaInputs.BOOLEAN,
        label: "Snap to Grid",
        value: state.snapToGrid,
        onChange: (value) =>
          setState((state) => ({ ...state, snapToGrid: value })),
      },
    }),
    { store },
    [state.snapToGrid]
  );

  return (
    <div
      onKeyDown={(ev) => {
        ev.stopPropagation();
      }}
    >
      <ThemedLevaPanel
        fill={true}
        titleBar={false}
        store={store}
        oneLineLabels
        hideCopyButton
      />
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
          <Icon.Eye boxSize="20px" />
          <Icon.Label>Reveal</Icon.Label>
        </Toolbar.Button>
      </Toolbar.Item>
      <Toolbar.Item isActive={state.fogMode === FogMode.shroud}>
        <Toolbar.Button
          onClick={() =>
            setState((state) => ({ ...state, fogMode: FogMode.shroud }))
          }
        >
          <Icon.EyeOff boxSize="20px" />
          <Icon.Label>Shroud</Icon.Label>
        </Toolbar.Button>
      </Toolbar.Item>
    </>
  );
};

const ShowGridSettingsPopupMapFragment = graphql`
  fragment dmMap_ShowGridSettingsPopupMapFragment on Map {
    id
    showGrid
    showGridToPlayers
  }
`;

const ShowGridSettingsPopupGridFragment = graphql`
  fragment dmMap_ShowGridSettingsPopupGridFragment on MapGrid {
    offsetX
    offsetY
    columnWidth
    columnHeight
    color
  }
`;

const MapUpdateGridMutation = graphql`
  mutation dmMap_mapUpdateGridMutation($input: MapUpdateGridInput!) {
    mapUpdateGrid(input: $input) {
      __typename
    }
  }
`;

const ShowGridSettingsPopup = React.memo(
  (props: {
    map: dmMap_ShowGridSettingsPopupMapFragment$key;
    grid: dmMap_ShowGridSettingsPopupGridFragment$key;
    enterConfigureGridMode: () => void;
  }) => {
    const [mapUpdateGrid] = useMutation<dmMap_mapUpdateGridMutation>(
      MapUpdateGridMutation
    );
    const map = useFragment(ShowGridSettingsPopupMapFragment, props.map);
    const grid = useFragment(ShowGridSettingsPopupGridFragment, props.grid);

    const [gridColor, setGridColor] = useResetState(() => grid.color, []);
    const [showGrid, setShowGrid] = useResetState(map.showGrid, []);
    const [showGridToPlayers, setShowGridToPlayers] = useResetState(
      map.showGridToPlayers,
      []
    );

    const syncState = useDebounceCallback(() => {
      mapUpdateGrid({
        variables: {
          input: {
            mapId: map.id,
            grid: {
              ...grid,
              color: gridColor,
            },
            showGrid,
            showGridToPlayers,
          },
        },
      });
    }, 300);

    return (
      <Toolbar.Popup>
        <VStack minWidth="300px" padding="3">
          <HStack width="100%" justifyContent="space-between">
            <Box>
              <Heading size="xs">Grid Settings</Heading>
            </Box>

            <Box>
              <Button.Tertiary small onClick={props.enterConfigureGridMode}>
                <span>Edit Grid </span>
                <Icon.Settings boxSize="12px" />
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

const GridSettingButtonMapFragment = graphql`
  fragment dmMap_GridSettingButton_MapFragment on Map {
    ...dmMap_ShowGridSettingsPopupMapFragment
    grid {
      ...dmMap_ShowGridSettingsPopupGridFragment
    }
  }
`;

const GridSettingButton = (props: {
  enterConfigureGridMode: () => void;
  map: dmMap_GridSettingButton_MapFragment$key;
}): React.ReactElement => {
  const map = useFragment(GridSettingButtonMapFragment, props.map);
  const [showMenu, setShowMenu] = React.useState(false);
  const ref = React.useRef<null | HTMLLIElement>(null);
  useOnClickOutside<HTMLLIElement>(ref, () => {
    setShowMenu(false);
  });

  const [dialogNode, showDialog] = useConfirmationDialog();

  return (
    <Toolbar.Item isActive={map.grid != null} ref={ref}>
      <Toolbar.Button
        onClick={() => {
          if (!map.grid) {
            showDialog({
              header: "Configure Grid",
              body: "This map currently has no grid data. Do you wanna add a new grid using the grid configurator?",
              onConfirm: props.enterConfigureGridMode,
              confirmButtonText: "Add Grid",
            });
          } else {
            setShowMenu((showMenu) => !showMenu);
          }
        }}
      >
        <Icon.Grid boxSize="20px" />
        <Icon.Label>Grid</Icon.Label>
      </Toolbar.Button>
      {showMenu && map.grid ? (
        <ShowGridSettingsPopup
          map={map}
          grid={map.grid}
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

  const updateRadiusRef = React.useRef<null | ((radius: number) => void)>(null);

  const store = useCreateStore();
  const [, set] = useControls(
    () => ({
      radius: {
        type: LevaInputs.NUMBER,
        label: "Size",
        value: tokenMarkerContext.state.tokenRadius.get(),
        step: 1,
        onChange: (value) => {
          tokenMarkerContext.state.tokenRadius.set(value);
        },
      },
      radiusShortcuts: buttonGroup({
        label: null,
        opts: {
          "0.25x": () => updateRadiusRef.current?.(0.25),
          "0.5x": () => updateRadiusRef.current?.(0.5),
          "1x": () => updateRadiusRef.current?.(1),
          "2x": () => updateRadiusRef.current?.(2),
          "3x": () => updateRadiusRef.current?.(3),
        },
      }),
      color: {
        type: LevaInputs.COLOR,
        label: "Color",
        value: tokenMarkerContext.state.tokenColor ?? "rgb(255, 255, 255)",
        onChange: (color: string) => {
          tokenMarkerContext.setState((state) => ({
            ...state,
            tokenColor: color,
          }));
        },
      },
      label: {
        type: LevaInputs.STRING,
        label: "Label",
        value: tokenMarkerContext.state.tokenText,
        optional: true,
        disabled: !tokenMarkerContext.state.includeTokenText,
        onChange: (tokenText, _, { initial, disabled, fromPanel }) => {
          if (initial || !fromPanel) {
            return;
          }

          tokenMarkerContext.setState((state) => ({
            ...state,
            includeTokenText: !disabled,
            tokenText: tokenText ?? state.tokenText,
          }));
        },
      },
      counter: {
        type: LevaInputs.NUMBER,
        label: "Counter",
        step: 1,
        min: 0,
        value: tokenMarkerContext.state.tokenCounter,
        optional: true,
        disabled: !tokenMarkerContext.state.includeTokenCounter,
        onChange: (tokenCounter, _, { initial, disabled, fromPanel }) => {
          if (initial || !fromPanel) {
            return;
          }

          tokenMarkerContext.setState((state) => ({
            ...state,
            includeTokenCounter: !disabled,
            tokenCounter: tokenCounter ?? state.tokenCounter,
          }));
        },
      },
    }),
    { store },
    [tokenMarkerContext.state]
  );

  React.useEffect(() => {
    updateRadiusRef.current = (factor) => {
      tokenMarkerContext.state.tokenRadius.set(
        (configureGridContext.state.columnWidth / 2) * factor * 0.9
      );
      set({
        radius: tokenMarkerContext.state.tokenRadius.get(),
      });
    };
  });

  return (
    <div
      onKeyDown={(ev) => {
        ev.stopPropagation();
      }}
    >
      <ThemedLevaPanel
        fill={true}
        titleBar={false}
        store={store}
        oneLineLabels
        hideCopyButton
      />
    </div>
  );
};

const dmTools: Array<ToolMapRecord> = [
  {
    name: "Move",
    icon: <Icon.Move boxSize="20px" />,
    tool: DragPanZoomMapTool,
    MenuComponent: null,
  },
  {
    name: "Brush",
    icon: <Icon.Pen boxSize="20px" />,
    tool: BrushMapTool,
    MenuComponent: BrushSettings,
  },
  {
    name: "Area",
    icon: <Icon.Crop boxSize="20px" />,
    tool: AreaSelectMapTool,
    MenuComponent: AreaSelectSettings,
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
  {
    name: "Token",
    icon: <Icon.Target boxSize="20px" />,
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
  io.literal(RulerMapTool.id),
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
            "Error occurred while trying to decode value.\n" +
              JSON.stringify(err, null, 2)
          );
        }
        return DragPanZoomMapTool.id;
      }, identity)
    ),
};

const MapPingMutation = graphql`
  mutation dmMap_MapPingMutation($input: MapPingInput!) {
    mapPing(input: $input)
  }
`;

const DMMapFragment = graphql`
  fragment dmMap_DMMapFragment on Map {
    id
    grid {
      color
      offsetX
      offsetY
      columnWidth
      columnHeight
    }
    ...mapView_MapFragment
    ...mapContextMenuRenderer_MapFragment
    ...dmMap_GridSettingButton_MapFragment
    ...dmMap_GridConfigurator_MapFragment
  }
`;

export const DmMap = (props: {
  map: dmMap_DMMapFragment$key;
  password: string;
  liveMapId: string | null;
  hideMap: () => void;
  showMapModal: () => void;
  openNotes: () => void;
  openMediaLibrary: () => void;
  sendLiveMap: (image: HTMLCanvasElement) => void;
  saveFogProgress: (image: HTMLCanvasElement) => void;
  updateToken: (
    id: string,
    changes: Omit<Partial<MapTokenEntity>, "id">
  ) => void;
  controlRef: React.MutableRefObject<MapControlInterface | null>;
}): React.ReactElement => {
  const map = useFragment(DMMapFragment, props.map);
  const [mapPing] = useMutation<dmMap_MapPingMutation>(MapPingMutation);
  const controlRef = props.controlRef;

  const [activeToolId, setActiveToolId] = usePersistedState(
    "activeDmTool",
    activeDmMapToolIdModel
  );

  const userSelectedTool = React.useMemo(() => {
    return (dmTools.find((tool) => tool.tool.id === activeToolId) ?? dmTools[0])
      .tool;
  }, [activeToolId]);

  const [toolOverride, setToolOverride] = React.useState<null | MapTool>(null);
  const activeTool = toolOverride ?? userSelectedTool;

  const isCurrentMapLive = map.id !== null && map.id === props.liveMapId;
  const isOtherMapLive = props.liveMapId !== null;

  const showToast = useToast();
  const asyncClipBoardApi = useAsyncClipboardApi();

  const copyMapToClipboard = () => {
    if (!controlRef.current || !asyncClipBoardApi) {
      return;
    }
    const { mapCanvas, fogCanvas } = controlRef.current.getContext();
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
          showToast({
            title: `Copied map image to clipboard.`,
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "top",
          });
        })
        .catch(console.error);
    });
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
          setActiveToolId(dmTools[toolIndex].tool.id);
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

  const [configureGridMapToolState, setConfigureGridMapToolState] =
    useResetState<ConfigureMapToolState>(
      () => ({
        offsetX: map.grid?.offsetX ?? 0,
        offsetY: map.grid?.offsetY ?? 0,
        columnWidth: map.grid?.columnWidth ?? 50,
        columnHeight: map.grid?.columnHeight ?? 50,
      }),
      [map.grid]
    );

  return (
    <FlatContextProvider
      value={[
        [ContextMenuStoreProvider, {}] as ComponentWithPropsTuple<
          React.ComponentProps<typeof ContextMenuStoreProvider>
        >,
        [SharedTokenStateProvider, {}] as ComponentWithPropsTuple<
          React.ComponentProps<typeof SharedTokenStateProvider>
        >,
        [
          MarkAreaToolContext.Provider,
          {
            value: {
              onMarkArea: ([x, y]) => {
                mapPing({
                  variables: {
                    input: {
                      mapId: map.id,
                      x,
                      y,
                    },
                  },
                });
              },
            },
          },
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
        [AreaSelectContextProvider, {}],
        [
          TokenMarkerContextProvider,
          { currentMapId: map.id },
        ] as ComponentWithPropsTuple<
          React.ComponentProps<typeof TokenMarkerContextProvider>
        >,
        [
          UpdateTokenContext.Provider,
          { value: props.updateToken },
        ] as ComponentWithPropsTuple<
          React.ComponentProps<typeof UpdateTokenContext["Provider"]>
        >,
        [
          IsDungeonMasterContext.Provider,
          { value: true },
        ] as ComponentWithPropsTuple<
          React.ComponentProps<typeof IsDungeonMasterContext["Provider"]>
        >,
      ]}
    >
      <React.Suspense fallback={null}>
        <LazyLoadedMapView
          map={map}
          grid={map.grid}
          activeTool={activeTool}
          controlRef={controlRef}
          sharedContexts={[
            MarkAreaToolContext,
            BrushToolContext,
            ConfigureGridMapToolContext,
            AreaSelectContext,
            TokenMarkerContext,
            NoteWindowActionsContext,
            ReactRelayContext,
            UpdateTokenContext,
            IsDungeonMasterContext,
            ContextMenuStoreContext,
            SharedTokenStateStoreContext,
          ]}
          fogOpacity={0.5}
        />
      </React.Suspense>

      {toolOverride !== ConfigureGridMapTool ? (
        <>
          <LeftToolbarContainer>
            <Toolbar>
              <Toolbar.Logo />
              <Toolbar.Group divider>
                {dmTools.map((record) => (
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
                          const canvasContext =
                            context.fogCanvas.getContext("2d")!;
                          applyFogRectangle(
                            FogMode.shroud,
                            [0, 0],
                            [context.fogCanvas.width, context.fogCanvas.height],
                            canvasContext
                          );
                          context.fogTexture.needsUpdate = true;
                          props.saveFogProgress(context.fogCanvas);
                        },
                      })
                    }
                  >
                    <Icon.Droplet fill="currentColor" boxSize="20px" />
                    <Icon.Label>Shroud All</Icon.Label>
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
                          const canvasContext =
                            context.fogCanvas.getContext("2d")!;
                          applyFogRectangle(
                            FogMode.clear,
                            [0, 0],
                            [context.fogCanvas.width, context.fogCanvas.height],
                            canvasContext
                          );
                          context.fogTexture.needsUpdate = true;
                          props.saveFogProgress(context.fogCanvas);
                        },
                      })
                    }
                  >
                    <Icon.Droplet boxSize="20px" />
                    <Icon.Label>Clear All</Icon.Label>
                  </Toolbar.Button>
                </Toolbar.Item>
              </Toolbar.Group>
            </Toolbar>
          </LeftToolbarContainer>
          <BottomToolbarContainer>
            <Toolbar horizontal>
              <Toolbar.Group>
                <GridSettingButton
                  map={map}
                  enterConfigureGridMode={() => {
                    setToolOverride(ConfigureGridMapTool);
                  }}
                />
                <Toolbar.Item isActive>
                  <Toolbar.Button
                    onClick={() => {
                      props.showMapModal();
                    }}
                  >
                    <Icon.Map boxSize="20px" />
                    <Icon.Label>Map Library</Icon.Label>
                  </Toolbar.Button>
                </Toolbar.Item>
                <Toolbar.Item isActive>
                  <Toolbar.Button
                    onClick={() => {
                      props.openMediaLibrary();
                    }}
                  >
                    <Icon.Image boxSize="20px" />
                    <Icon.Label>Media Library</Icon.Label>
                  </Toolbar.Button>
                </Toolbar.Item>
                <Toolbar.Item isActive>
                  <Toolbar.Button
                    onClick={() => {
                      props.openNotes();
                    }}
                  >
                    <Icon.BookOpen boxSize="20px" />
                    <Icon.Label>Notes</Icon.Label>
                  </Toolbar.Button>
                </Toolbar.Item>
              </Toolbar.Group>
            </Toolbar>
            <MarginLeftDiv />
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
                    <Icon.Pause
                      stroke={
                        props.liveMapId !== null
                          ? "hsl(360, 83%, 62%)"
                          : "hsl(211, 27%, 70%)"
                      }
                      boxSize="20px"
                    />
                    <Icon.Label
                      color={
                        props.liveMapId !== null
                          ? "hsl(360, 83%, 62%)"
                          : "hsl(211, 27%, 70%)"
                      }
                    >
                      Stop Sharing
                    </Icon.Label>
                  </ConditionalWrap>
                </Toolbar.Item>
                {isCurrentMapLive ? (
                  <Toolbar.Item>
                    <Icon.Radio stroke="hsl(160, 51%, 49%)" boxSize="20px" />
                    <Icon.Label color="hsl(160, 51%, 49%)">Live</Icon.Label>
                  </Toolbar.Item>
                ) : isOtherMapLive ? (
                  <Toolbar.Item>
                    <Icon.Radio stroke="hsl(48, 94%, 68%)" boxSize="20px" />
                    <Icon.Label color="hsl(48, 94%, 68%)">Live</Icon.Label>
                  </Toolbar.Item>
                ) : (
                  <Toolbar.Item>
                    <Icon.Radio stroke="hsl(211, 27%, 70%)" boxSize="20px" />
                    <Icon.Label color="hsl(211, 27%, 70%)">Not Live</Icon.Label>
                  </Toolbar.Item>
                )}
                {asyncClipBoardApi ? (
                  <Toolbar.Item isActive>
                    <Toolbar.Button onClick={copyMapToClipboard}>
                      <Icon.Clipboard boxSize="20px" />
                      <Icon.Label>Clipboard</Icon.Label>
                    </Toolbar.Button>
                  </Toolbar.Item>
                ) : null}
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
                    <Icon.Send boxSize="20px" />
                    <Icon.Label>Send</Icon.Label>
                  </Toolbar.Button>
                </Toolbar.Item>
              </Toolbar.Group>
            </Toolbar>
          </BottomToolbarContainer>
        </>
      ) : (
        <GridConfigurator
          map={map}
          onAbort={() => {
            setToolOverride(null);
          }}
          onConfirm={() => {
            setToolOverride(null);
          }}
        />
      )}
      {confirmDialogNode}
      <SharedTokenMenu currentMapId={map.id} />
      <ContextMenuRenderer map={map} />
    </FlatContextProvider>
  );
};

export const LeftToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  position: absolute;
  height: 100%;
  top: 0;
  left: 12px;
  pointer-events: none;
  @media (max-width: 580px) {
    top: 1em;
    align-items: start;
  }
`;

const BottomToolbarContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  position: absolute;
  bottom: 12px;
  pointer-events: none;
  flex-wrap: wrap;
`;

const MarginLeftDiv = styled.div`
  margin-left: 24px;
  @media (max-width: 580px) {
    margin-left: 0px;
  }
`;

export const MenuItemRenderer = (props: {
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
        <Icon.Label>{props.record.name} </Icon.Label>
      </Toolbar.Button>
      {props.record.MenuComponent && props.isActive && showMenu ? (
        <Toolbar.Popup>
          <props.record.MenuComponent />
        </Toolbar.Popup>
      ) : null}
    </Toolbar.Item>
  );
};

const GridConfigurator_MapFragment = graphql`
  fragment dmMap_GridConfigurator_MapFragment on Map {
    id
    showGrid
    showGridToPlayers
  }
`;

const GridConfigurator = (props: {
  map: dmMap_GridConfigurator_MapFragment$key;
  onAbort: () => void;
  onConfirm: () => void;
}): React.ReactElement => {
  const map = useFragment(GridConfigurator_MapFragment, props.map);
  const [mapUpdateGrid] = useMutation<dmMap_mapUpdateGridMutation>(
    MapUpdateGridMutation
  );

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
      zIndex="1"
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
            <Icon.X boxSize="20px" /> <span>Abort</span>
          </Button.Tertiary>
        </div>
        <div>
          <Button.Primary
            small
            onClick={() => {
              mapUpdateGrid({
                variables: {
                  input: {
                    mapId: map.id,
                    grid: {
                      color: "rgba(0, 0, 0, 0.08)",
                      columnWidth: state.columnWidth,
                      columnHeight: state.columnHeight,
                      offsetX: state.offsetX,
                      offsetY: state.offsetY,
                    },
                    showGrid: map.showGrid,
                    showGridToPlayers: map.showGridToPlayers,
                  },
                },
              }).finally(() => {
                props.onConfirm();
              });
            }}
          >
            <span>Confirm</span> <Icon.ChevronRight boxSize="20px" />
          </Button.Primary>
        </div>
      </div>
    </Stack>
  );
};
