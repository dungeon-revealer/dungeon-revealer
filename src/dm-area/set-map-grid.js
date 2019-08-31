import React, { useState, useRef, useEffect, useCallback } from "react";
import styled from "@emotion/styled/macro";
import * as Icons from "../feather-icons";
import * as Button from "../button";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import { loadImage } from "../util";
import { useLongPress } from "../hooks/use-long-press";
import { Input } from "../input";

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  background: black;
`;

const MapContainer = styled.div`
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow-y: scroll;
`;

const ToolbarContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  position: absolute;
  width: 100%;
  left: 0;
  bottom: 12px;
`;

const SvgGridOverlay = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
`;

const InstructionBubble = styled.div`
  pointer-events: all;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 15px;
  background-color: rgba(255, 255, 255, 1);
  text-align: center;
  width: max-content;
  display: ${p => (p.horizontal ? "flex" : null)};
  align-items: ${p => (p.horizontal ? "center" : null)};
  padding: 16px;
  min-width: 300px;
`;

const InstructionBubbleActions = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: center;
`;

const PartialContainer = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
`;

const getEventPoint = ev => {
  const rect = ev.target.getBoundingClientRect();
  const target = ev.touches ? ev.touches[0] : ev;
  const x = target.clientX - rect.left;
  const y = target.clientY - rect.top;
  return { x, y };
};

function getSvgMousePosition(svg, evt) {
  const CTM = svg.getScreenCTM();
  if (evt.touches) {
    evt = evt.touches[0];
  }
  return {
    x: (evt.clientX - CTM.e) / CTM.a,
    y: (evt.clientY - CTM.f) / CTM.d
  };
}

const calculatePartialCoords = (p1, p2) => {
  const width = Math.max(p1.x, p2.x) - Math.min(p1.x, p2.x);
  const height = Math.max(p1.y, p2.y) - Math.min(p1.y, p2.y);
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);

  return { x, y, width, height };
};

const roundPrecise = (num, decimals) => {
  const t = Math.pow(10, decimals);
  return (
    Math.round(
      num * t +
        (decimals > 0 ? 1 : 0) *
          (Math.sign(num) * (10 / Math.pow(100, decimals)))
    ) / t
  ).toFixed(decimals);
};

const SideLengthControls = ({ sideLength, setSideLength }) => {
  const plusHandler = useCallback(() => {
    setSideLength(sideLength =>
      String(roundPrecise(parseFloat(sideLength, 10) + 0.1, 2))
    );
  }, [setSideLength]);
  const minusHandler = useCallback(() => {
    setSideLength(sideLength =>
      String(roundPrecise(parseFloat(sideLength, 10) - 0.1, 2))
    );
  }, [setSideLength]);

  const plusLongPressProps = useLongPress(() => {
    const interval = setInterval(plusHandler, 100);
    return () => clearInterval(interval);
  });

  const minusLongPressProps = useLongPress(() => {
    const interval = setInterval(minusHandler, 100);
    return () => clearInterval(interval);
  });

  return (
    <div style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>
        <label>
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>Side Length</div>
          <div style={{ display: "flex" }}>
            <div style={{ flexGrow: 1 }}>
              <Input
                placeholder="Side Length"
                value={sideLength}
                disabled
                type="text"
              />
            </div>
            <div>
              <Button.Tertiary
                {...plusLongPressProps}
                onClick={() => {
                  setSideLength(sideLength =>
                    String(roundPrecise(parseFloat(sideLength, 10) + 0.1, 2))
                  );
                }}
                small
              >
                <Icons.PlusIcon />
              </Button.Tertiary>
            </div>
            <div>
              <Button.Tertiary
                {...minusLongPressProps}
                onClick={() => {
                  setSideLength(sideLength =>
                    String(roundPrecise(parseFloat(sideLength, 10) - 0.1, 2))
                  );
                }}
                small
              >
                <Icons.MinusIcon />
              </Button.Tertiary>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
};

const incrementStep = (value, step = 0.1) =>
  String(roundPrecise(parseFloat(value, 10) + step, 2));

const OffsetControls = ({ offset, setOffset }) => {
  const upHandler = useCallback(() => {
    setOffset(offset => ({ ...offset, y: incrementStep(offset.y, -1) }));
  }, [setOffset]);
  const downHandler = useCallback(() => {
    setOffset(offset => ({ ...offset, y: incrementStep(offset.y, 1) }));
  }, [setOffset]);
  const rightHandler = useCallback(() => {
    setOffset(offset => ({ ...offset, x: incrementStep(offset.x, 1) }));
  }, [setOffset]);

  const leftHandler = useCallback(() => {
    setOffset(offset => ({ ...offset, x: incrementStep(offset.x, -1) }));
  }, [setOffset]);

  const upLongPressProps = useLongPress(() => {
    const interval = setInterval(upHandler, 100);
    return () => clearInterval(interval);
  });
  const downLongPressProps = useLongPress(() => {
    const interval = setInterval(downHandler, 100);
    return () => clearInterval(interval);
  });
  const rightLongPressProps = useLongPress(() => {
    const interval = setInterval(rightHandler, 100);
    return () => clearInterval(interval);
  });
  const leftLongPressProps = useLongPress(() => {
    const interval = setInterval(leftHandler, 100);
    return () => clearInterval(interval);
  });

  return (
    <div style={{ display: "flex", marginTop: 16 }}>
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ marginRight: 8 }}>
          <label>
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>
              X-Coordinate
            </div>
            <div style={{ display: "flex" }}>
              <div style={{ flexGrow: 1 }}>
                <Input value={offset.x} disabled />
              </div>
              <div>
                <Button.Tertiary
                  {...rightLongPressProps}
                  onClick={rightHandler}
                  small
                >
                  <Icons.PlusIcon />
                </Button.Tertiary>
              </div>
              <div>
                <Button.Tertiary
                  {...leftLongPressProps}
                  onClick={leftHandler}
                  small
                >
                  <Icons.MinusIcon />
                </Button.Tertiary>
              </div>
            </div>
          </label>
        </div>
        <div style={{ marginLeft: 8 }}>
          <label>
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>
              Y-Coordinate
            </div>
            <div style={{ display: "flex" }}>
              <div style={{ flexGrow: 1 }}>
                <Input value={offset.y} disabled />
              </div>
              <div>
                <Button.Tertiary
                  {...downLongPressProps}
                  onClick={downHandler}
                  small
                >
                  <Icons.PlusIcon />
                </Button.Tertiary>
              </div>
              <div>
                <Button.Tertiary
                  {...upLongPressProps}
                  onClick={upHandler}
                  small
                >
                  <Icons.MinusIcon />
                </Button.Tertiary>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

const sizeFactor = 5;

const PartialCursor = ({ isSelecting, start, end }) => {
  if (!start) return null;
  if (!isSelecting && start) {
    return (
      <g transform={`translate(${start.x}, ${start.y})`}>
        <line
          x1="-10"
          x2="10"
          y2="0"
          y1="0"
          stroke="purple"
          strokeWidth="2"
        ></line>
        <line
          y1="-10"
          y2="10"
          x1="0"
          x2="0"
          stroke="purple"
          strokeWidth="2"
        ></line>
      </g>
    );
  } else if (isSelecting && start && end) {
    const { x, y, width, height } = calculatePartialCoords(start, end);
    return (
      <rect
        width={width}
        height={height}
        stroke="purple"
        strokeWidth="2"
        x={x}
        y={y}
        fill="transparent"
      />
    );
  }

  return null;
};

export const SetMapGrid = ({ map, onSuccess, onAbort }) => {
  const [image, setImage] = useState(null);
  const [sideLength, setSideLength] = useState(
    map.grid ? map.grid.sideLength : 40
  );
  const [offset, setOffset] = useState({
    x: map.grid ? map.grid.x : 0,
    y: map.grid ? map.grid.y : 0
  });

  const canvasRef = useRef();
  const partialCanvasRef = useRef();
  const [step, setStep] = useState("MOVE_BLUE_SQUARE");
  const [partialCoordinates, setPartialCoordinates] = useState({
    x: 0,
    y: 0,
    width: 120,
    height: 120
  });

  const gridRef = useRef(null);
  const blueBoxRef = useRef(null);

  useAsyncEffect(
    function*(onCancel) {
      const task = loadImage(`/map/${map.id}/map`);
      onCancel(() => task.cancel());
      const image = yield task.promise;
      setImage(image);
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
    },
    [map]
  );

  useEffect(() => {
    if (!partialCanvasRef.current) return;
    const canvas = canvasRef.current;
    const partialCanvas = partialCanvasRef.current;
    const partialContext = partialCanvas.getContext("2d");
    partialContext.drawImage(
      canvas,
      partialCoordinates.x,
      partialCoordinates.y,
      partialCoordinates.width,
      partialCoordinates.height,
      0,
      0,
      partialCanvas.width,
      partialCanvas.height
    );
  }, [partialCoordinates, image]);

  const [partialCursorState, setPartialCursorState] = useState({
    isSelecting: false,
    start: null,
    end: null
  });
  const partialCursorStateRef = useRef(partialCursorState);
  partialCursorStateRef.current = partialCursorState;

  const onBlueBoxDown = useCallback(
    ev => {
      if (step !== "MOVE_BLUE_SQUARE") return;
      const offset = getSvgMousePosition(gridRef.current, ev);
      offset.x -= parseFloat(ev.target.getAttributeNS(null, "x"));
      offset.y -= parseFloat(ev.target.getAttributeNS(null, "y"));
      const listener = ev => {
        ev.preventDefault();
        const coords = getSvgMousePosition(gridRef.current, ev);

        setPartialCoordinates({
          x: coords.x - offset.x,
          y: coords.y - offset.y,
          width: 120,
          height: 120
        });
      };
      window.addEventListener("mousemove", listener);
      window.addEventListener("touchmove", listener);

      const endListener = () => {
        window.removeEventListener("mousemove", listener);
        window.removeEventListener("touchmove", listener);
        window.removeEventListener("touchend", endListener);
        window.removeEventListener("mouseup", endListener);
      };

      window.addEventListener("mouseup", endListener);
      window.addEventListener("touchend", endListener);
    },
    [step]
  );

  const onPartialDown = useCallback(
    ev => {
      const p1 = getEventPoint(ev);
      setPartialCursorState(state => ({
        ...state,
        start: p1,
        isSelecting: true
      }));
      const moveListener = ev => {
        const p = getEventPoint(ev);
        if (!partialCursorStateRef.current.isSelecting) {
          setPartialCursorState(state => ({ ...state, start: p }));
          return;
        }
        setPartialCursorState(state => ({ ...state, end: p }));
      };

      const endListener = ev => {
        ev.stopPropagation();
        window.removeEventListener("mouseup", endListener);
        window.removeEventListener("touchend", endListener);
        window.removeEventListener("mousemove", moveListener);
        window.removeEventListener("touchmove", moveListener);
        const p2 =
          ev.touches && ev.touches
            ? partialCursorStateRef.current.end
            : getEventPoint(ev);
        const partialCoords = calculatePartialCoords(p1, p2);
        const realX = partialCoordinates.x + partialCoords.x / sizeFactor;
        const realY = partialCoordinates.y + partialCoords.y / sizeFactor;
        const realWidth = partialCoords.width / sizeFactor;
        setSideLength(realWidth);
        setOffset({ y: realY, x: realX });
        setPartialCursorState(state => ({
          ...state,
          isSelecting: false,
          end: null
        }));
      };

      window.addEventListener("mouseup", endListener);
      window.addEventListener("touchend", endListener);
      window.addEventListener("mousemove", moveListener);
      window.addEventListener("touchmove", moveListener);
    },
    [partialCoordinates.x, partialCoordinates.y]
  );

  return (
    <Container>
      <MapContainer>
        {image ? (
          <>
            <canvas ref={canvasRef} height={image.height} width={image.width} />
            <SvgGridOverlay
              viewBox={`0 0 ${image.width} ${image.height}`}
              height={image.height}
              width={image.width}
              ref={gridRef}
            >
              <defs>
                <pattern
                  id="grid"
                  width={sideLength}
                  height={sideLength}
                  patternUnits="userSpaceOnUse"
                  x={offset.x}
                  y={offset.y}
                >
                  <path
                    d={`M ${sideLength} 0 L 0 0 0 ${sideLength}`}
                    fill="none"
                    stroke="red"
                    strokeWidth="2"
                  />
                </pattern>
              </defs>
              <rect
                width={image.width}
                height={image.height}
                fill="url(#grid)"
                x={0}
                y={0}
              />
              <rect
                width={sideLength}
                height={sideLength}
                stroke="green"
                strokeWidth="2"
                fill="transparent"
                x={offset.x}
                y={offset.y}
              />
              <rect
                ref={blueBoxRef}
                width={partialCoordinates.width}
                height={partialCoordinates.height}
                x={partialCoordinates.x}
                y={partialCoordinates.y}
                stroke="blue"
                fill="transparent"
                strokeWidth="2"
                cursor={step === "MOVE_BLUE_SQUARE" ? "move" : undefined}
                onMouseDown={onBlueBoxDown}
                onTouchStart={onBlueBoxDown}
              />
            </SvgGridOverlay>
          </>
        ) : null}
      </MapContainer>
      {partialCoordinates && image ? (
        <PartialContainer
          style={{ display: step === "SELECT_GRID_BASE" ? undefined : "none" }}
        >
          <div
            style={{
              position: "relative"
            }}
          >
            <canvas
              ref={partialCanvasRef}
              width={partialCoordinates.width * sizeFactor}
              height={partialCoordinates.height * sizeFactor}
              onMouseDown={onPartialDown}
              onTouchStart={onPartialDown}
              onMouseLeave={() => {
                setPartialCursorState(state => ({
                  ...state,
                  isSelecting: false,
                  start: null,
                  end: null
                }));
              }}
            />
            <SvgGridOverlay
              viewBox={`0 0 ${partialCoordinates.width *
                sizeFactor} ${partialCoordinates.height * sizeFactor}`}
              height={partialCoordinates.height * sizeFactor}
              width={partialCoordinates.width * sizeFactor}
              style={{ pointerEvents: "none" }}
            >
              <defs>
                <pattern
                  id="grid1"
                  width={sideLength * sizeFactor}
                  height={sideLength * sizeFactor}
                  patternUnits="userSpaceOnUse"
                  x={(offset.x - partialCoordinates.x) * sizeFactor}
                  y={(offset.y - partialCoordinates.y) * sizeFactor}
                >
                  <path
                    d={`M ${sideLength * sizeFactor} 0 L 0 0 0 ${sideLength *
                      sizeFactor}`}
                    fill="none"
                    stroke="red"
                    strokeWidth="2"
                  />
                </pattern>
              </defs>
              <rect
                width={image.width}
                height={image.height}
                fill="url(#grid1)"
                x={0}
                y={0}
              />
              <rect
                width={sideLength * sizeFactor}
                height={sideLength * sizeFactor}
                stroke="green"
                strokeWidth="2"
                fill="transparent"
                x={(offset.x - partialCoordinates.x) * sizeFactor}
                y={(offset.y - partialCoordinates.y) * sizeFactor}
              />
              <PartialCursor {...partialCursorState} />
            </SvgGridOverlay>
          </div>
        </PartialContainer>
      ) : null}

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          paddingTop: "20px"
        }}
      >
        <InstructionBubble>
          {step === "MOVE_BLUE_SQUARE" ? (
            <>
              <h1>
                Move the blue square to a area where you want to select your
                grid
              </h1>
              <InstructionBubbleActions>
                <div>
                  <Button.Tertiary
                    style={{ marginRight: 16 }}
                    onClick={() => {
                      onAbort();
                    }}
                  >
                    <Icons.XIcon /> <span>Abort</span>
                  </Button.Tertiary>
                </div>
                <div>
                  <Button.Primary
                    onClick={() => {
                      setStep("SELECT_GRID_BASE");
                    }}
                  >
                    <span>Next</span> <Icons.ChevronRightIcon />
                  </Button.Primary>
                </div>
              </InstructionBubbleActions>
            </>
          ) : step === "SELECT_GRID_BASE" ? (
            <>
              <h1>Select a single grid square</h1>
              <InstructionBubbleActions>
                <div>
                  <Button.Tertiary
                    style={{ marginRight: 16 }}
                    onClick={() => {
                      onAbort();
                    }}
                  >
                    <Icons.XIcon /> <span>Abort</span>
                  </Button.Tertiary>
                </div>
                <div>
                  <Button.Primary
                    style={{ marginRight: 16 }}
                    onClick={() => {
                      setStep("MOVE_BLUE_SQUARE");
                    }}
                  >
                    <Icons.ChevronLeftIcon /> <span>Back</span>
                  </Button.Primary>
                </div>
                <div>
                  <Button.Primary
                    onClick={() => {
                      setStep("FINE_TUNE_VALUES");
                    }}
                  >
                    <span>Next</span> <Icons.ChevronRightIcon />
                  </Button.Primary>
                </div>
              </InstructionBubbleActions>
            </>
          ) : step === "FINE_TUNE_VALUES" ? (
            <>
              <h1>Fine tune grid values</h1>
              <InstructionBubbleActions>
                <div>
                  <Button.Tertiary
                    style={{ marginRight: 16 }}
                    onClick={() => {
                      onAbort();
                    }}
                  >
                    <Icons.XIcon /> Abort
                  </Button.Tertiary>
                </div>
                <div>
                  <Button.Primary
                    style={{ marginRight: 16 }}
                    onClick={() => {
                      setStep("SELECT_GRID_BASE");
                    }}
                  >
                    <Icons.ChevronLeftIcon /> <span>Back</span>
                  </Button.Primary>
                </div>
                <div>
                  <Button.Primary
                    onClick={() => {
                      onSuccess(map.id, {
                        x: parseFloat(String(offset.x)),
                        y: parseFloat(String(offset.y)),
                        sideLength: parseFloat(String(sideLength))
                      });
                    }}
                  >
                    <span>Done</span>
                    <Icons.CheckIcon />
                  </Button.Primary>
                </div>
              </InstructionBubbleActions>
            </>
          ) : null}
        </InstructionBubble>
      </div>

      {step === "FINE_TUNE_VALUES" ? (
        <ToolbarContainer>
          <div
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 16,
              marginRight: 16
            }}
          >
            <SideLengthControls
              sideLength={sideLength}
              setSideLength={setSideLength}
            />

            <OffsetControls offset={offset} setOffset={setOffset} />
          </div>
        </ToolbarContainer>
      ) : null}
    </Container>
  );
};
