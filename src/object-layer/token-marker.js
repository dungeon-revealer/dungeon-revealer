import React, { useRef, useEffect } from "react";
import { darken, lighten } from "polished";
import { useSpring, animated, to as interpolate } from "react-spring";
import { useResetState } from "../hooks/use-reset-state";

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
        isLocked,
        ...props
      },
      ref
    ) => {
      const gRef = useRef(null);
      const circleRef = useRef(null);
      const textRef = useRef(null);
      const ratioRef = useRef(ratio);

      const [localColor, setLocalColor] = useResetState(color, [color]);

      const [animatedProps, set] = useSpring(() => ({
        to: {
          x,
          y,
          radius,
        },
      }));

      React.useEffect(() => {
        set({
          x: x * ratio,
          y: y * ratio,
          radius: radius * ratio,
        });
      }, [x, y, radius, set, ratio]);

      useEffect(() => {
        ratioRef.current = ratio;
        if (ref && !ref.current) {
          ref.current = {
            setTransform: (x, y) => {
              set({
                x: x * ratioRef.current,
                y: y * ratioRef.current,
                immediate: true,
              });
            },
            setRadius: (radius) => {
              set({ radius: radius * ratioRef.current, immediate: true });
            },
          };
        }
      });

      return (
        <animated.g
          ref={gRef}
          transform={interpolate(
            [animatedProps.x, animatedProps.y],
            (x, y) => `translate(${x}, ${y})`
          )}
          opacity={isVisibleForPlayers ? 1 : 0.7}
          {...props}
        >
          <animated.circle
            onMouseEnter={() => {
              if (onMouseDown) {
                setLocalColor(lighten(0.1, color));
              }
            }}
            onMouseLeave={() => {
              if (onMouseDown) {
                setLocalColor(color);
              }
            }}
            ref={circleRef}
            r={animatedProps.radius}
            strokeWidth={animatedProps.radius.to((val) => val * 0.05)}
            stroke={darken(0.1, localColor)}
            fill={localColor}
            opacity="1"
            onClick={onClick}
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
          />

          <animated.text
            ref={textRef}
            pointerEvents="none"
            textAnchor="middle"
            stroke="black"
            fontSize={animatedProps.radius}
            dy=".3em"
          >
            {label}
          </animated.text>
        </animated.g>
      );
    }
  )
);
