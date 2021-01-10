import * as React from "react";
import { animated, to } from "react-spring";
import { CirclePicker } from "react-color";
import {
  TokenContextMenuContext,
  TokenContextMenuState,
} from "./token-context-menu-context";
import { useOnClickOutside } from "./hooks/use-on-click-outside";
import { useResetState } from "./hooks/use-reset-state";
import { useAnimatedWindowDimensions } from "./hooks/use-window-dimensions";
import { MapTokenEntity } from "./map-typings";
import { useDebounceCallback } from "./hooks/use-debounce-callback";
import * as Button from "./button";
import * as Icon from "./feather-icons";
import { useNoteWindowActions } from "./dm-area/token-info-aside";
import { useShowSelectNoteModal } from "./dm-area/select-note-modal";
import { ConfigureGridMapToolContext } from "./map-tools/configure-grid-map-tool";
import { useAnimatedDimensions } from "./hooks/use-animated-dimensions";
import {
  Box,
  NumberIncrementStepper,
  NumberDecrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
  InputGroup,
  InputLeftAddon,
  Stack,
  FormControl,
  FormLabel,
  Input,
  HStack,
  Switch,
  Flex,
  Center,
} from "@chakra-ui/react";
import { ColorPickerInput } from "./color-picker-input";

export const TokenContextRenderer = (props: {
  updateToken: (
    tokenId: string,
    changes: Omit<Partial<MapTokenEntity>, "id">
  ) => void;
  deleteToken: (tokenId: string) => void;
  tokens: Array<MapTokenEntity>;
  children: React.ReactNode;
}) => {
  const [state, setState] = React.useState<TokenContextMenuState>(() => ({
    type: "none-selected",
  }));
  const ref = React.useRef<null | HTMLDivElement>(null);
  useOnClickOutside<HTMLDivElement>(ref, () => {
    setState((state) =>
      state.type === "none-selected"
        ? state
        : {
            type: "none-selected",
          }
    );
  });

  const activeToken = React.useMemo(() => {
    if (state.type === "none-selected") {
      return null;
    }
    return props.tokens.find((token) => token.id === state.tokenId) ?? null;
  }, [props.tokens, state]);

  const width = 600;
  const windowDimensions = useAnimatedWindowDimensions();
  const dimensions = useAnimatedDimensions(ref);

  return (
    <TokenContextMenuContext.Provider value={{ state, setState }}>
      {props.children}
      {state.type === "selected" && activeToken ? (
        <animated.div
          ref={ref}
          style={{
            position: "absolute",
            background: "white",
            padding: 12,
            top: 0,
            left: 0,
            borderRadius: 12,
            transform: to(
              [state.position, windowDimensions, dimensions] as const,
              (
                [clickX, clickY],
                [windowWidth, windowHeight],
                [menuWidth, menuHeight]
              ) => {
                let x = clickX - menuWidth / 2;

                if (x + menuWidth > windowWidth) {
                  x = windowWidth - menuWidth;
                }
                if (x < 0) {
                  x = 0;
                }

                let y = clickY;

                if (y + menuHeight > windowHeight) {
                  y = windowHeight - menuHeight;
                }

                return `translate(${x}px, ${y}px)`;
              }
            ),
            width: width,
          }}
          onKeyPress={(ev) => {
            ev.stopPropagation();
          }}
        >
          <TokenContextMenu
            key={activeToken.id}
            token={activeToken}
            updateToken={(changes) =>
              props.updateToken(activeToken.id, changes)
            }
            deleteToken={() => props.deleteToken(activeToken.id)}
            close={() => setState({ type: "none-selected" })}
          />
        </animated.div>
      ) : null}
    </TokenContextMenuContext.Provider>
  );
};

const TokenContextMenu = (props: {
  token: MapTokenEntity;
  updateToken: (changes: Omit<Partial<MapTokenEntity>, "id">) => void;
  deleteToken: () => void;
  close: () => void;
}): React.ReactElement => {
  const noteWindowActions = useNoteWindowActions();
  const [
    showSelectTokenMarkerModalNode,
    showSelectTokenMarkerModal,
  ] = useShowSelectNoteModal();

  const [label, setLabel] = useResetState(props.token.label, [
    props.token.label,
  ]);
  const [radius, setRadius] = useResetState(props.token.radius, [
    props.token.radius,
  ]);
  const [x, setX] = useResetState(props.token.x, [props.token.x]);
  const [y, setY] = useResetState(props.token.y, [props.token.x]);
  const [isVisibleForPlayers, setIsVisibleForPlayers] = useResetState(
    props.token.isVisibleForPlayers,
    [props.token.isVisibleForPlayers]
  );
  const [isMovableByPlayers, setIsMovableByPlayers] = useResetState(
    props.token.isMovableByPlayers,
    [props.token.isMovableByPlayers]
  );

  const [color, setColor] = useResetState(props.token.color, [
    props.token.color,
  ]);

  const [isLocked, setIsLocked] = useResetState(props.token.isLocked, [
    props.token.isLocked,
  ]);

  const sync = useDebounceCallback(() => {
    props.updateToken({
      label,
      isVisibleForPlayers,
      isMovableByPlayers,
      radius,
      color,
      x,
      y,
    });
  }, 300);

  const gridContext = React.useContext(ConfigureGridMapToolContext);

  return (
    <>
      {showSelectTokenMarkerModalNode}
      <HStack alignItems="stretch" spacing="5">
        <Stack width="100%">
          <FormControl size="sm">
            <FormLabel>Label</FormLabel>
            <Input
              placeholder=""
              value={label}
              onChange={(ev) => {
                setLabel(ev.target.value);
                sync();
              }}
            />
          </FormControl>
          <FormControl size="sm">
            <FormLabel>Size</FormLabel>
            <InputGroup>
              <NumberInput
                value={radius}
                onChange={(valueString) => {
                  let radius = parseFloat(valueString);
                  if (Number.isNaN(radius)) {
                    radius = 1;
                  }
                  setRadius(radius);
                  sync();
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
          <div>
            <Button.Tertiary
              small
              onClick={() => {
                props.updateToken({
                  radius: (gridContext.state.columnWidth / 2) * 0.25 - 5,
                });
              }}
            >
              0.25x
            </Button.Tertiary>
            <Button.Tertiary
              small
              onClick={() => {
                props.updateToken({
                  radius: (gridContext.state.columnWidth / 2) * 0.5 - 8,
                });
              }}
            >
              0.5x
            </Button.Tertiary>
            <Button.Tertiary
              small
              onClick={() => {
                props.updateToken({
                  radius: (gridContext.state.columnWidth / 2) * 1 - 8,
                });
              }}
            >
              1x
            </Button.Tertiary>
            <Button.Tertiary
              small
              onClick={() => {
                props.updateToken({
                  radius: (gridContext.state.columnWidth / 2) * 2 - 8,
                });
              }}
            >
              2x
            </Button.Tertiary>
            <Button.Tertiary
              small
              onClick={() => {
                props.updateToken({
                  radius: (gridContext.state.columnWidth / 2) * 3 - 8,
                });
              }}
            >
              3x
            </Button.Tertiary>
          </div>
          <FormControl size="sm">
            <FormLabel>Color</FormLabel>
            <Stack>
              <ColorPickerInput
                size="sm"
                width="250px"
                color={color}
                onChange={(color) => {
                  setColor(color);
                  sync();
                }}
              />
              <ColorPicker
                color={color}
                onChange={(color) => {
                  setColor(color);
                  sync();
                }}
              />
            </Stack>
          </FormControl>
        </Stack>
        <Stack width="100%">
          <FormControl>
            <FormLabel>Reference</FormLabel>
            <Flex>
              <Box flex="1">{props.token.reference ? "Note" : "None"}</Box>
              <Center>
                {props.token.reference ? (
                  <>
                    <div>
                      <Button.Tertiary
                        small
                        onClick={() => {
                          props.updateToken({ reference: null });
                        }}
                      >
                        <Icon.TrashIcon size={16} />
                        <span>Remove</span>
                      </Button.Tertiary>
                    </div>
                    <div style={{ paddingLeft: 8 }}>
                      <Button.Tertiary
                        small
                        onClick={() => {
                          noteWindowActions.focusOrShowNoteInNewWindow(
                            props.token.reference!.id
                          );
                          props.close();
                        }}
                      >
                        <Icon.EditIcon size={16} />
                        <span>Edit</span>
                      </Button.Tertiary>
                    </div>
                  </>
                ) : (
                  <div>
                    <Button.Tertiary
                      small
                      onClick={() =>
                        showSelectTokenMarkerModal((documentId) => {
                          props.updateToken({
                            reference: {
                              type: "note",
                              id: documentId,
                            },
                          });
                          noteWindowActions.focusOrShowNoteInNewWindow(
                            documentId
                          );
                        })
                      }
                    >
                      <Icon.Link height={16} />
                      <span>Link</span>
                    </Button.Tertiary>
                  </div>
                )}
              </Center>
            </Flex>
          </FormControl>
          <FormControl size="sm">
            <FormLabel as="div">Position</FormLabel>
            <Stack>
              <InputGroup size="sm">
                <InputLeftAddon
                  pointerEvents="none"
                  children={<Text fontWeight="bold">X</Text>}
                />
                <NumberInput
                  value={x}
                  onChange={(valueString) => {
                    let x = parseFloat(valueString);
                    if (Number.isNaN(x)) {
                      x = 0;
                    }
                    setX(x);
                    sync();
                  }}
                  isDisabled={isLocked}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </InputGroup>
              <InputGroup size="sm">
                <InputLeftAddon
                  pointerEvents="none"
                  children={<Text fontWeight="bold">Y</Text>}
                />
                <NumberInput
                  value={y}
                  onChange={(valueString) => {
                    let y = parseFloat(valueString);
                    if (Number.isNaN(y)) {
                      y = 0;
                    }
                    setY(y);
                    sync();
                  }}
                  isDisabled={isLocked}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </InputGroup>
            </Stack>
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="label-is-visible-to-players" mb="0">
              Visible to players
            </FormLabel>
            <Switch
              id="label-is-visible-to-players"
              isChecked={isVisibleForPlayers}
              onChange={(ev) => {
                setIsVisibleForPlayers(ev.target.checked);
                sync();
              }}
            />
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="label-is-movable-by-players" mb="0">
              Movable by players
            </FormLabel>
            <Switch
              id="label-is-movable-by-players"
              isChecked={isMovableByPlayers}
              onChange={(ev) => {
                setIsMovableByPlayers(ev.target.checked);
                sync();
              }}
            />
          </FormControl>
        </Stack>
      </HStack>
      <hr style={{ borderWidth: 0.3, marginTop: 12, marginBottom: 12 }} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div>
          <Button.Tertiary
            small
            onClick={() => {
              props.updateToken({ isLocked: !isLocked });
            }}
            title={isLocked ? "Unlock position" : "Lock position"}
          >
            {isLocked ? (
              <Icon.LockIcon height={16} />
            ) : (
              <Icon.UnlockIcon height={16} />
            )}
            <span>{isLocked ? "Unlock position" : "Lock position"}</span>
          </Button.Tertiary>
        </div>
        <div style={{ marginLeft: 8 }}>
          <Button.Tertiary
            small
            onClick={() => {
              props.deleteToken();
            }}
            disabled={isLocked}
            title="Delete Token"
          >
            <Icon.TrashIcon size={16} />
            <span>Delete</span>
          </Button.Tertiary>
        </div>
      </div>
    </>
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
