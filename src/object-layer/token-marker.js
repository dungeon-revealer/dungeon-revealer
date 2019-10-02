import React from "react";
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
        ratio = 1,
        ...props
      },
      ref
    ) => {
      return (
        <g
          ref={ref}
          transform={`translate(${x * ratio}, ${y * ratio})`}
          {...props}
        >
          <circle
            tokenid={id}
            r={radius * ratio}
            strokeWidth={radius * ratio * 0.05}
            stroke={darken(0.1, color)}
            fill={color}
            opacity="1"
            onClick={onClick}
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
          />

          <text
            pointerEvents="none"
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
