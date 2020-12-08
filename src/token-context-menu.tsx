import * as React from "react";
import { animated } from "react-spring";
import { CirclePicker } from "react-color";
import {
  TokenContextMenuContext,
  TokenContextMenuState,
} from "./token-context-menu-context";
import { useOnClickOutside } from "./hooks/use-on-click-outside";
import { useResetState } from "./hooks/use-reset-state";
import { Input } from "./input";
import { MapTokenEntity } from "./map-typings";
import { ToggleSwitch } from "./toggle-switch";
import { useDebounceCallback } from "./hooks/use-debounce-callback";
import { parseNumberSafe } from "./parse-number-safe";
import * as Button from "./button";
import * as Icon from "./feather-icons";
import { useNoteWindowActions } from "./dm-area/token-info-aside";
import { useShowSelectNoteModal } from "./dm-area/select-note-modal";

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

  const ref = useOnClickOutside<HTMLDivElement>(() => {
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
            transform: state.position.to((x, y) => `translate(${x}px, ${y}px)`),
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

  const rangeSliderRef = React.useRef<HTMLInputElement | null>(null);

  const sync = useDebounceCallback(() => {
    props.updateToken({
      label,
      isVisibleForPlayers,
      isMovableByPlayers,
      radius: rangeSliderRef.current
        ? parseNumberSafe(rangeSliderRef.current.value) ?? undefined
        : undefined,
      color,
    });
  }, 300);

  return (
    <>
      {showSelectTokenMarkerModalNode}
      <div style={{ display: "flex" }}>
        <div style={{ paddingRight: 8, flex: 1 }}>
          <div style={{ display: "flex", width: "100%" }}>
            <div style={{ flexGrow: 1 }}>
              <label>
                <h6 style={{ marginBottom: 8, marginTop: 0 }}>Label</h6>
                <Input
                  placeholder="Label"
                  value={label}
                  onChange={(ev) => {
                    setLabel(ev.target.value);
                    sync();
                  }}
                  style={{ marginBottom: 24 }}
                />
              </label>
            </div>
          </div>
          <label>
            <h6 style={{ marginBottom: 8, marginTop: 0 }}>Size</h6>
            <input
              ref={rangeSliderRef}
              type="range"
              min="1"
              max="200"
              step="1"
              onChange={(ev) => {
                sync();
              }}
              style={{ width: "100%", display: "block", marginTop: 0 }}
              defaultValue={props.token.radius}
            />
          </label>
          <div>
            <h6 style={{ marginBottom: 16, marginTop: 0 }}>Color</h6>
            <ColorPicker
              color={color}
              onChange={(color) => {
                setColor(color);
                sync();
              }}
            />
          </div>
        </div>
        <div style={{ paddingLeft: 8, flex: 1 }}>
          <label>
            <h6 style={{ marginBottom: 8, marginTop: 0 }}>Player Appearance</h6>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ flexGrow: 1 }}>Visible to Players</div>
              <div style={{ marginLeft: 8 }}>
                <ToggleSwitch
                  checked={isVisibleForPlayers}
                  onChange={(checked) => {
                    setIsVisibleForPlayers(checked);
                    sync();
                  }}
                />
              </div>
            </div>
          </label>
          <label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              <div style={{ flexGrow: 1 }}>Moveable by Players</div>
              <div style={{ marginLeft: 8 }}>
                <ToggleSwitch
                  checked={isMovableByPlayers}
                  onChange={(checked) => {
                    setIsMovableByPlayers(checked);
                    sync();
                  }}
                />
              </div>
            </div>
          </label>
          <div>
            <h6 style={{ marginBottom: 8 }}>Reference</h6>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <div>{props.token.reference ? "Note" : "None"}</div>
              <div
                style={{
                  flexGrow: 1,
                  paddingLeft: 8,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
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
                        <Icon.EditIcon height={16} />
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
              </div>
            </div>
          </div>
        </div>
      </div>
      <hr style={{ borderWidth: 0.3, marginTop: 12, marginBottom: 12 }} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div>
          <Button.Tertiary
            small
            onClick={() => {
              props.updateToken({ isLocked: !isLocked });
            }}
            title={isLocked ? "Unlock" : "Lock"}
          >
            {isLocked ? (
              <Icon.LockIcon height={16} />
            ) : (
              <Icon.UnlockIcon height={16} />
            )}
            <span>{isLocked ? "Unlock" : "Lock"}</span>
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
