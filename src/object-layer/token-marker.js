import React, { useRef } from "react";

export const TokenMarker = React.memo(
  React.forwardRef(({ x, y, id, radius, color, label, ...props }, ref) => {
    return (
      <g ref={ref} transform={`translate(${x}, ${y})`} {...props}>
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
  })
);

export const DmTokenMarker = React.memo(
  ({ getRelativePosition, updateTokenPosition, ...props }) => {
    const tokenRef = useRef();

    return (
      <TokenMarker
        ref={tokenRef}
        {...props}
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
