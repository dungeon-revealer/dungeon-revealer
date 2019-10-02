import React, { useRef, useState, useEffect } from "react";
import { TokenMarker } from "./token-marker";
import { CirclePicker } from "react-color";
import { Input } from "../input";
import { Modal } from "../dm-area/modal";
import { useResetState } from "../hooks/use-reset-state";

const TokenContextMenu = ({
  token: { label, color, radius },
  updateToken,
  styles
}) => {
  const ref = useRef();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [labelValue, setLabelValue] = useResetState(() => label, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [colorValue, setColorValue] = useResetState(() => color, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [radiusValue, setRadiusValue] = useResetState(() => radius, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateToken({
        label: labelValue,
        color: colorValue,
        radius: radiusValue
      });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelValue, colorValue, radiusValue]);

  return (
    <div
      ref={ref}
      style={{
        backgroundColor: "white",
        padding: 10,
        borderRadius: 5,
        ...styles
      }}
      onClick={ev => {
        ev.stopPropagation();
        ev.preventDefault();
      }}
      onMouseDown={ev => {
        ev.stopPropagation();
      }}
    >
      <Input
        value={labelValue}
        onChange={ev => setLabelValue(ev.target.value)}
        style={{ marginBottom: 24 }}
      />
      <input
        type="range"
        min="1"
        max="200"
        step="1"
        value={radiusValue}
        onChange={ev => {
          setRadiusValue(Math.min(200, Math.max(0, ev.target.value)));
        }}
        style={{ width: "100%", display: "block" }}
      />
      <CirclePicker
        color={colorValue}
        onChangeComplete={color => {
          setColorValue(color.hex);
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
  ({ getRelativePosition, updateToken, ...props }) => {
    const tokenRef = useRef();
    const [contextMenuEvent, setContextMenuEvent] = useState(null);

    return (
      <>
        <TokenMarker
          ref={tokenRef}
          {...props}
          onClick={ev => {
            ev.preventDefault();
            ev.stopPropagation();
          }}
          onMouseDown={ev => {
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.button !== 0) return;
            ev.preventDefault();
            ev.stopPropagation();

            const onMouseMove = ev => {
              ev.preventDefault();
              ev.stopPropagation();

              const { x, y } = getRelativePosition({
                x: ev.pageX,
                y: ev.pageY
              });
              tokenRef.current.setAttribute(
                "transform",
                `translate(${x}, ${y})`
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

              updateToken({ x, y });
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
              styles={calculatePerfectContextMenuPositionStyles(
                contextMenuEvent
              )}
            />
          </Modal>
        ) : null}
      </>
    );
  }
);
