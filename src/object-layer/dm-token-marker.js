import React, { useRef, useState } from "react";
import { TokenMarker } from "./token-marker";
import { CirclePicker } from "react-color";
import { Input } from "../input";
import * as Button from "../button";
import * as Icon from "../feather-icons";
import { Modal } from "../dm-area/modal";
import { ToggleSwitch } from "../toggle-switch";

const TokenContextMenu = ({
  token: { label, color, radius, isVisibleForPlayers },
  updateToken,
  deleteToken,
  styles,
  close
}) => {
  const ref = useRef();

  return (
    <div
      ref={ref}
      onClick={ev => {
        ev.stopPropagation();
      }}
      style={{
        backgroundColor: "white",
        padding: 10,
        borderRadius: 5,
        width: "260px",
        boxShadow: "0 0 15px rgba(0,0,0,0.1)",
        ...styles
      }}
    >
      <div style={{ display: "flex", width: "100%" }}>
        <div style={{ flexGrow: 1 }}>
          <Input
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
              deleteToken();
              close();
            }}
          >
            <Icon.TrashIcon height={16} />
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
            onChange={ev => {
              updateToken({ isVisibleForPlayers: ev.target.checked });
            }}
          />
        </div>
      </label>

      <h6 style={{ marginBottom: 16 }}>Radius</h6>
      <input
        type="range"
        min="1"
        max="200"
        step="1"
        value={radius}
        onChange={ev => {
          updateToken({ radius: Math.min(200, Math.max(0, ev.target.value)) });
        }}
        style={{ width: "100%", display: "block", marginTop: 0 }}
      />
      <h6 style={{ marginBottom: 16 }}>Color</h6>
      <CirclePicker
        color={color}
        onChangeComplete={color => {
          updateToken({ color: color.hex });
        }}
      />
    </div>
  );
};

const calculatePerfectContextMenuPositionStyles = event => {
  const clickX = event.clientX;
  const clickY = event.clientY;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const rootW = 0;
  const rootH = 0;

  const right = screenW - clickX > rootW;
  const left = !right;
  const top = screenH - clickY > rootH;
  const bottom = !top;

  const result = {
    position: "absolute"
  };

  if (right) {
    result.left = `${clickX + 5}px`;
  }

  if (left) {
    result.left = `${clickX - rootW - 5}px`;
  }

  if (top) {
    result.top = `${clickY + 5}px`;
  }

  if (bottom) {
    result.top = `${clickY - rootH - 5}px`;
  }

  return result;
};

export const DmTokenMarker = React.memo(
  ({ getRelativePosition, updateToken, deleteToken, ratio, ...props }) => {
    const tokenRef = useRef();
    const [contextMenuEvent, setContextMenuEvent] = useState(null);

    return (
      <>
        <TokenMarker
          ref={tokenRef}
          ratio={ratio}
          {...props}
          onClick={ev => {
            ev.preventDefault();
            ev.stopPropagation();
          }}
          onTouchStart={ev => {
            ev.preventDefault();
            ev.stopPropagation();

            const { x, y } = getRelativePosition({
              x: ev.touches[0].pageX,
              y: ev.touches[0].pageY
            });

            const diffX = x - props.x;
            const diffY = y - props.y;
            let currentX = x;
            let currentY = y;

            const onTouchMove = ev => {
              ev.preventDefault();
              ev.stopPropagation();

              const { x, y } = getRelativePosition({
                x: ev.touches[0].pageX,
                y: ev.touches[0].pageY
              });

              currentX = x - diffX;
              currentY = y - diffY;

              tokenRef.current.setAttribute(
                "transform",
                `translate(${currentX * ratio}, ${currentY * ratio})`
              );
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
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.button !== 0) return;

            const { x, y } = getRelativePosition({
              x: ev.pageX,
              y: ev.pageY
            });

            const diffX = x - props.x;
            const diffY = y - props.y;

            const onMouseMove = ev => {
              ev.preventDefault();
              ev.stopPropagation();

              const { x, y } = getRelativePosition({
                x: ev.pageX,
                y: ev.pageY
              });

              tokenRef.current.setAttribute(
                "transform",
                `translate(${(x - diffX) * ratio}, ${(y - diffY) * ratio})`
              );
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
            ev.persist();
            ev.preventDefault();
            ev.stopPropagation();
            setContextMenuEvent(ev);
          }}
        />
        {contextMenuEvent ? (
          <Modal
            backgroundStyles={{
              backgroundColor: "transparent"
            }}
            onClickOutside={ev => {
              ev.preventDefault();
              ev.stopPropagation();

              setContextMenuEvent(null);
            }}
            onPressEscape={() => setContextMenuEvent(null)}
          >
            <TokenContextMenu
              token={props}
              updateToken={updateToken}
              deleteToken={deleteToken}
              styles={calculatePerfectContextMenuPositionStyles(
                contextMenuEvent
              )}
              close={() => setContextMenuEvent(null)}
            />
          </Modal>
        ) : null}
      </>
    );
  }
);
