import React, { useRef } from "react";
import { darken } from "polished";

export const TokenMarker = React.memo(
  React.forwardRef(
    (
      {
        x,
        y,
        id,
        radius,
        color,
        label,
        onClick,
        onMouseDown,
        onContextMenu,
        ...props
      },
      ref
    ) => {
      return (
        <g ref={ref} transform={`translate(${x}, ${y})`} {...props}>
          <circle
            tokenid={id}
            r={radius}
            strokeWidth="10"
            stroke={darken(0.1, color)}
            fill={color}
            opacity="1"
            onClick={onClick}
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
          />

          <text
            pointerEvents="none"
            strokeWidth="0.25%"
            textAnchor="middle"
            stroke="black"
            fontSize={radius}
            dy=".3em"
          >
            {label}
          </text>
        </g>
      );
    }
  )
);

export const DmTokenMarker = React.memo(
  ({ getRelativePosition, updateTokenPosition, ...props }) => {
    const tokenRef = useRef();

    return (
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
            tokenRef.current.setAttribute("transform", `translate(${x}, ${y})`);
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

            updateTokenPosition({ x, y });
          };
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", onMouseUp);
        }}
        onContextMenu={ev => {
          ev.preventDefault();
          ev.stopPropagation();
        }}
      />
    );
  }
);
