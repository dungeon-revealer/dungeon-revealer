import React, { useRef } from "react";

export const TokenMarker = React.memo(
  ({
    x,
    y,
    id,
    radius,
    color,
    getRelativePosition,
    label,
    updateTokenPosition
  }) => {
    const tokenRef = useRef();

    return (
      <g
        ref={tokenRef}
        pointerEvents="all"
        cursor="pointer"
        onClick={ev => {
          ev.preventDefault();
          ev.stopPropagation();
        }}
        onMouseDown={ev => {
          if (ev.button !== 0) return;
          ev.preventDefault();
          ev.stopPropagation();

          const onMouseMove = ev => {
            ev.preventDefault();
            ev.stopPropagation();

            const { x, y } = getRelativePosition({ x: ev.pageX, y: ev.pageY });
            tokenRef.current.setAttribute("transform", `translate(${x}, ${y})`);
          };
          const onMouseUp = ev => {
            ev.preventDefault();
            ev.stopPropagation();

            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("mousemove", onMouseMove);
            const { x, y } = getRelativePosition({ x: ev.pageX, y: ev.pageY });

            updateTokenPosition({ x, y, id, radius, color });
          };
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", onMouseUp);
        }}
        onContextMenu={ev => {
          ev.preventDefault();
          ev.stopPropagation();
        }}
        transform={`translate(${x}, ${y})`}
      >
        <circle
          tokenid={id}
          className="tokenCircle"
          r={radius}
          strokeWidth="0.5%"
          stroke="black"
          fill={color}
          opacity="1"
        />

        <text
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
);
