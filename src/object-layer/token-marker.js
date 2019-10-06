import React, { useRef, useEffect } from "react";
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
        isVisibleForPlayers,
        onClick,
        onMouseDown,
        onContextMenu,
        ratio = 1,
        ...props
      },
      ref
    ) => {
      const gRef = useRef(null);
      const circleRef = useRef(null);
      const textRef = useRef(null);

      const ratioRef = useRef(ratio);

      useEffect(() => {
        ratioRef.current = ratio;
        if (ref && !ref.current) {
          ref.current = {
            setTransform: (x, y) => {
              gRef.current.setAttribute(
                "transform",
                `translate(${x * ratio}, ${y * ratio})`
              );
            },
            setRadius: radius => {
              circleRef.current.setAttribute("r", radius * ratio);
              circleRef.current.setAttribute(
                "stroke-width",
                radius * ratio * 0.05
              );
              textRef.current.setAttribute("font-size", radius * ratio);
            }
          };
        }
      });

      return (
        <g
          ref={gRef}
          transform={`translate(${x * ratio}, ${y * ratio})`}
          opacity={isVisibleForPlayers ? 1 : 0.7}
          {...props}
        >
          <circle
            ref={circleRef}
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
            ref={textRef}
            pointerEvents="none"
            textAnchor="middle"
            stroke="black"
            fontSize={radius * ratio}
            dy=".3em"
          >
            {label}
          </text>
        </g>
      );
    }
  )
);
