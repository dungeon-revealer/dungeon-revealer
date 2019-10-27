import React from "react";
import { SpringValue, to, animated } from "react-spring";
import { useResetState } from "./hooks/use-reset-state";

const noopStyle = {};

const innerStyles = {
  transformOrigin: "0 0 0",
  willChange: "transform",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  display: "inline-block"
};

const ZOOM_SPEED_MULTIPLIER = 0.065;

const getScaleMultiplier = (delta, zoomSpeed = 1) => {
  const speed = ZOOM_SPEED_MULTIPLIER * zoomSpeed;
  let scaleMultiplier = 1;
  if (delta > 0) {
    // zoom out
    scaleMultiplier = 1 - speed;
  } else if (delta < 0) {
    // zoom in
    scaleMultiplier = 1 + speed;
  }

  return scaleMultiplier;
};

export const PanZoom = React.forwardRef(
  (
    {
      translate: _translate,
      scale: _scale,
      style = noopStyle,
      children,
      minZoom = 0,
      maxZoom = Infinity,
      zoomSpeed = 1,
      ...props
    },
    ref
  ) => {
    const containerRef = React.useRef(null);
    const dragContainerRef = React.useRef(null);
    const [translate] = useResetState(
      () => _translate || new SpringValue([0, 0]),
      [_translate]
    );

    const [scale] = useResetState(() => _scale || new SpringValue(1), [_scale]);
    const transform = to(
      [scale, translate],
      (scale, [x, y]) => `translate(${x}px, ${y}px) scale(${scale})`
    );

    const getOffset = React.useCallback(ev => {
      const containerRect = containerRef.current.getBoundingClientRect();
      const offsetX = ev.clientX - containerRect.left;
      const offsetY = ev.clientY - containerRect.top;
      return { x: offsetX, y: offsetY };
    }, []);

    const zoomTo = React.useCallback(
      ({ x, y, ratio }) => {
        const [transformX, transformY] = translate.get();
        let newScale = scale.get() * ratio;
        if (newScale < minZoom) {
          if (scale === minZoom) {
            return;
          }
          ratio = minZoom / scale;
          newScale = minZoom;
        } else if (newScale > maxZoom) {
          if (scale === maxZoom) {
            return;
          }
          ratio = maxZoom / scale;
          newScale = maxZoom;
        }

        const newX = x - ratio * (x - transformX);
        const newY = y - ratio * (y - transformY);
        translate.set([newX, newY]);
        scale.set(newScale);
      },
      [scale, translate, minZoom, maxZoom]
    );

    const centeredZoom = React.useCallback(
      ({ delta, speed = zoomSpeed }) => {
        const containerRect = containerRef.current.getBoundingClientRect();
        const ratio = getScaleMultiplier(delta, speed);
        zoomTo({
          x: containerRect.width / 2,
          y: containerRect.height / 2,
          ratio
        });
      },
      [zoomSpeed, zoomTo]
    );

    React.useEffect(() => {
      const onWheel = ev => {
        const ratio = getScaleMultiplier(ev.deltaY, zoomSpeed);
        const { x, y } = getOffset(ev);
        zoomTo({ x, y, ratio });
        ev.preventDefault();
        ev.stopPropagation();
      };

      const node = containerRef.current;
      node.addEventListener("wheel", onWheel, {
        passive: false
      });

      return () => {
        node.removeEventListener("wheel", onWheel, {
          passive: false
        });
      };
    }, [scale, zoomSpeed, zoomTo, getOffset]);

    React.useEffect(() => {
      ref.current = {
        zoomIn: speed => {
          centeredZoom({ delta: -1, speed });
        },
        zoomOut: speed => {
          centeredZoom({ delta: 1, speed });
        },
        autoCenter: (zoomLevel = 1) => {
          const containerRect = containerRef.current.getBoundingClientRect();
          const dragContainer = dragContainerRef.current;
          const { clientWidth, clientHeight } = dragContainer;
          const widthRatio = containerRect.width / clientWidth;
          const heightRatio = containerRect.height / clientHeight;

          const newScale = Math.min(widthRatio, heightRatio) * zoomLevel;

          const x = (containerRect.width - clientWidth * newScale) / 2;
          const y = (containerRect.height - clientHeight * newScale) / 2;
          translate.set([x, y]);
          scale.set(newScale);
        },
        getDragContainer: () => dragContainerRef.current
      };
    });

    return (
      <div
        ref={containerRef}
        style={{
          ...style,
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d"
        }}
        onDoubleClick={ev => {
          zoomTo({ x: ev.clientX, y: ev.clientY, ratio: 2 });
        }}
        onMouseDown={ev => {
          if (props.onMouseDown) props.onMouseDown(ev);
          const bounds = dragContainerRef.current.getBoundingClientRect();
          const offsetX = ev.clientX - bounds.x;
          const offsetY = ev.clientY - bounds.y;

          const onMouseMove = ev => {
            translate.set([ev.clientX - offsetX, ev.clientY - offsetY]);
          };

          const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
          };
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", onMouseUp);
        }}
        onTouchStart={ev => {
          if (props.onTouchStart) props.onTouchStart(ev);
          const bounds = dragContainerRef.current.getBoundingClientRect();
          const offsetX = ev.touches[0].clientX - bounds.x;
          const offsetY = ev.touches[0].clientY - bounds.y;

          let onTouchMove = ev => {
            if (ev.touches.length === 2) {
              return;
            } else {
              translate.set([
                ev.touches[0].clientX - offsetX,
                ev.touches[0].clientY - offsetY
              ]);
            }
          };

          if (ev.touches.length === 2) {
            const xCenter = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
            const yCenter = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;

            let previousDiff = Math.hypot(
              ev.touches[0].clientX - ev.touches[1].clientX,
              ev.touches[0].clientY - ev.touches[1].clientY
            );

            onTouchMove = ev => {
              if (ev.touches.length === 2) {
                const newDiff = Math.hypot(
                  ev.touches[0].clientX - ev.touches[1].clientX,
                  ev.touches[0].clientY - ev.touches[1].clientY
                );
                if (newDiff === previousDiff) return;
                zoomTo({
                  x: xCenter,
                  y: yCenter,
                  ratio: newDiff > previousDiff ? 1.03 : 0.97
                });
                previousDiff = newDiff;
              }
            };
          }

          const onTouchEnd = () => {
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
          };

          window.addEventListener("touchmove", onTouchMove);
          window.addEventListener("touchend", onTouchEnd);
        }}
      >
        <animated.div
          ref={dragContainerRef}
          style={{
            ...innerStyles,
            transform,
            WebkitTransform: transform
          }}
        >
          {children}
        </animated.div>
      </div>
    );
  }
);
