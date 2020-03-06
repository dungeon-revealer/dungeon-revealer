import React, { useRef, useState, useEffect, useCallback } from "react";
import { useSpring, animated, to } from "react-spring";
import { CirclePicker } from "react-color";
import { TokenMarker } from "./token-marker";
import { Input } from "../input";
import * as Button from "../button";
import * as Icon from "../feather-icons";
import { Modal } from "../dm-area/modal";
import { ToggleSwitch } from "../toggle-switch";
import { SelectTokenMarkerReferenceModal } from "../dm-area/select-token-marker-reference-modal";
import { useFetch } from "../dm-area/fetch-context";
import { useOvermind } from "../hooks/use-overmind";

const ColorPicker = React.memo(({ color, onChange, styles }) => {
  return (
    <CirclePicker
      color={color}
      onChangeComplete={color => onChange(color.hex)}
      styles={styles}
    />
  );
});

const TokenContextMenu = ({
  tokenRef,
  position,
  token: {
    id: tokenId,
    label,
    color,
    radius,
    isVisibleForPlayers,
    isLocked,
    reference
  },
  updateToken,
  deleteToken,
  close,
  showChooseReferencedNoteModalDialog
}) => {
  const { actions } = useOvermind();

  const containerRef = useRef(null);
  const rangeSlideRef = useRef(null);
  const initialCoords = useRef({
    x: window.innerWidth,
    y: window.innerHeight
  });

  // Position 1: we use spring values as a two way data bindings of the position.
  const [{ x, y }, set] = useSpring(() => ({
    // Position 2: we want to position the context menu offscreen first.
    to: initialCoords.current,
    immediate: true
  }));

  // Position 3: we want to adjust the position once we know the rendered size of our context menu.
  useEffect(() => {
    // in case we do not set the timeout the bound properties will all be zero.
    const timeout = setTimeout(() => {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const { clientHeight, clientWidth } = document.documentElement;

      let { x, y } = position;
      if (x + width > clientWidth) {
        x = x - width;
      }
      if (y + height > clientHeight) {
        y = y - height;
      }

      if (y < 0) {
        y = 5;
      }
      initialCoords.current.x = x;
      initialCoords.current.y = y;
      set({ to: { x, y }, immediate: true });
    });

    return () => clearTimeout(timeout);
  }, [position, set]);

  useEffect(() => {
    if (!rangeSlideRef.current) return;
    rangeSlideRef.current.value = radius;
  }, [radius]);

  const onChangeComplete = useCallback(
    color => {
      updateToken({ color: color });
    },
    [updateToken]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    setTimeout(() => {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const { clientHeight, clientWidth } = document.documentElement;
      let { x, y } = position;
      if (x + width > clientWidth) {
        x = x - width;
      }
      if (y + height > clientHeight) {
        y = y - height;
      }

      if (y < 0) {
        y = 5;
      }
      initialCoords.current.x = x;
      initialCoords.current.y = y;
      set({ to: { x, y }, immediate: true });
    }, 0);
  }, [set, position]);
  return (
    <animated.div
      ref={containerRef}
      onClick={ev => {
        ev.stopPropagation();
      }}
      style={{
        backgroundColor: "white",
        padding: 10,
        borderRadius: 5,
        width: "260px",
        boxShadow: "0 0 15px rgba(0,0,0,0.1)",
        transform: to([x, y], (x, y) => `translate(${x}px, ${y}px)`),
        top: 0,
        left: 0,
        position: "absolute"
      }}
    >
      <div style={{ display: "flex", width: "100%" }}>
        <div style={{ flexGrow: 1 }}>
          <Input
            disabled={isLocked}
            placeholder="Label"
            value={label}
            onChange={ev => updateToken({ label: ev.target.value })}
            style={{ marginBottom: 24 }}
          />
        </div>
        <div style={{ paddingLeft: 8 }}>
          <Button.Tertiary
            iconOnly
            onClick={() => {
              updateToken({ isLocked: !isLocked });
            }}
          >
            {isLocked ? (
              <Icon.LockIcon height={16} />
            ) : (
              <Icon.UnlockIcon height={16} />
            )}
          </Button.Tertiary>
        </div>
      </div>

      <label
        style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
      >
        <div style={{ flexGrow: 1 }}>Visible to Players</div>
        <div style={{ marginLeft: 8 }}>
          <ToggleSwitch
            checked={isVisibleForPlayers}
            disabled={isLocked}
            onChange={ev => {
              updateToken({ isVisibleForPlayers: ev.target.checked });
            }}
          />
        </div>
      </label>
      <h6 style={{ marginBottom: 16 }}>Radius</h6>
      <input
        ref={rangeSlideRef}
        type="range"
        min="1"
        max="200"
        step="1"
        disabled={isLocked}
        onChange={ev => {
          const radiusValue = Math.min(200, Math.max(0, ev.target.value));
          tokenRef.current.setRadius(radiusValue);
        }}
        onMouseUp={ev => {
          updateToken({
            radius: Math.min(200, Math.max(0, ev.target.value))
          });
        }}
        style={{ width: "100%", display: "block", marginTop: 0 }}
      />
      <h6 style={{ marginBottom: 16 }}>Color</h6>
      <ColorPicker color={color} onChange={onChangeComplete} />
      <div
        style={{
          paddingTop: 16,
          display: "flex",
          justifyContent: "flex-end"
        }}
      >
        <div style={{ flex: 1 }}>
          {reference ? (
            <Button.Tertiary
              onClick={() => {
                actions.tokenInfoAside.toggleActiveToken({
                  id: tokenId,
                  reference
                });
                close();
              }}
            >
              Edit Note
            </Button.Tertiary>
          ) : (
            <Button.Tertiary onClick={showChooseReferencedNoteModalDialog}>
              Link Note
            </Button.Tertiary>
          )}
        </div>
        <div>
          <Button.Tertiary
            iconOnly
            onClick={() => {
              if (isLocked) return;
              deleteToken();
              close();
            }}
            disabled={isLocked}
          >
            <Icon.TrashIcon height={16} />
          </Button.Tertiary>
        </div>
      </div>
    </animated.div>
  );
};

export const DmTokenMarker = React.memo(
  ({
    getRelativePosition,
    updateToken,
    deleteToken,
    ratio,
    onClick,
    token
  }) => {
    const { actions } = useOvermind();
    const localFetch = useFetch();
    const tokenRef = useRef();
    const [contextMenuCoordinates, setContextMenuCoordinates] = useState(null);
    const [
      showChooseReferencedNoteModalDialog,
      setShowChooseReferencedNoteModalDialog
    ] = useState(false);

    const isDraggingRef = useRef(false);

    return (
      <>
        <TokenMarker
          ref={tokenRef}
          ratio={ratio}
          {...token}
          isAnimated={false}
          onDoubleClick={ev => ev.stopPropagation()}
          onClick={ev => {
            ev.preventDefault();
            ev.stopPropagation();
            if (isDraggingRef.current === false) {
              onClick();
            }
            isDraggingRef.current = false;
          }}
          onTouchStart={ev => {
            if (token.isLocked) return;
            ev.preventDefault();
            ev.stopPropagation();

            const { x, y } = getRelativePosition({
              x: ev.touches[0].pageX,
              y: ev.touches[0].pageY
            });

            const diffX = x - token.x;
            const diffY = y - token.y;
            let currentX = x;
            let currentY = y;

            const onTouchMove = ev => {
              isDraggingRef.current = true;
              ev.preventDefault();
              ev.stopPropagation();

              const { x, y } = getRelativePosition({
                x: ev.touches[0].pageX,
                y: ev.touches[0].pageY
              });

              currentX = x - diffX;
              currentY = y - diffY;

              tokenRef.current.setTransform(currentX, currentY);
            };
            const onTouchEnd = ev => {
              ev.preventDefault();
              ev.stopPropagation();

              window.removeEventListener("touchend", onTouchEnd);
              window.removeEventListener("touchmove", onTouchMove);

              updateToken({ x: currentX, y: currentY });
            };
            window.addEventListener("touchmove", onTouchMove);
            window.addEventListener("touchend", onTouchEnd);
          }}
          onMouseDown={ev => {
            if (token.isLocked) return;
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.button !== 0) return;

            const { x, y } = getRelativePosition({
              x: ev.pageX,
              y: ev.pageY
            });

            const diffX = x - token.x;
            const diffY = y - token.y;

            const onMouseMove = ev => {
              isDraggingRef.current = true;
              ev.preventDefault();
              ev.stopPropagation();

              const { x, y } = getRelativePosition({
                x: ev.pageX,
                y: ev.pageY
              });

              tokenRef.current.setTransform(x - diffX, y - diffY);
            };
            const onMouseUp = ev => {
              ev.preventDefault();
              ev.stopPropagation();

              window.removeEventListener("mouseup", onMouseUp);
              window.removeEventListener("mousemove", onMouseMove);
              const { x, y } = getRelativePosition({
                x: ev.pageX,
                y: ev.pageY
              });

              updateToken({ x: x - diffX, y: y - diffY });
            };
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
          }}
          onContextMenu={ev => {
            ev.preventDefault();
            ev.stopPropagation();
            setContextMenuCoordinates({ x: ev.clientX, y: ev.clientY });
          }}
        />
        {contextMenuCoordinates ? (
          <Modal
            backgroundStyles={{
              backgroundColor: "transparent"
            }}
            onClickOutside={ev => {
              ev.preventDefault();
              ev.stopPropagation();

              setContextMenuCoordinates(null);
            }}
            onPressEscape={() => setContextMenuCoordinates(null)}
          >
            <TokenContextMenu
              tokenRef={tokenRef}
              token={token}
              updateToken={updateToken}
              deleteToken={deleteToken}
              position={contextMenuCoordinates}
              close={() => setContextMenuCoordinates(null)}
              showChooseReferencedNoteModalDialog={() =>
                setShowChooseReferencedNoteModalDialog(true)
              }
            />
          </Modal>
        ) : null}
        {showChooseReferencedNoteModalDialog ? (
          <SelectTokenMarkerReferenceModal
            close={() => setShowChooseReferencedNoteModalDialog(false)}
            onConfirm={async type => {
              let noteId = null;
              // eslint-disable-next-line default-case
              switch (type) {
                case "NEW_NOTE": {
                  const response = await localFetch(`/notes`, {
                    method: "POST",
                    body: JSON.stringify({}),
                    headers: {
                      "Content-Type": "application/json"
                    }
                  });
                  const body = await response.json();
                  noteId = body.data.note.id;
                  break;
                }
              }
              if (!noteId) return;
              const reference = {
                type: "note",
                id: noteId
              };
              await updateToken({
                reference
              });
              setContextMenuCoordinates(null);
              await actions.tokenInfoAside.toggleActiveToken({
                id: token.id,
                reference
              });

              setShowChooseReferencedNoteModalDialog(false);
            }}
          />
        ) : null}
      </>
    );
  }
);
