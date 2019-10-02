import React, { useRef, useState, useEffect } from "react";
import { PanZoom } from "react-easy-panzoom";
import Referentiel from "referentiel";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import { loadImage, getOptimalDimensions } from "./util";
import { useLongPress } from "./hooks/use-long-press";
import { ObjectLayer } from "./object-layer";
import { Toolbar } from "./toolbar";
import styled from "@emotion/styled/macro";
import * as Icons from "./feather-icons";
import { useSocket } from "./socket";
import { AreaMarkerRenderer } from "./object-layer/area-marker-renderer";
import { TokenRenderer } from "./object-layer/token-renderer";

const ToolbarContainer = styled.div`
  position: absolute;
  display: flex;
  justify-content: center;
  width: 100%;
  bottom: 0;
  bottom: 12px;
  pointer-events: none;
`;

const reduceOffsetToMinimum = (offset, sideLength) => {
  const newOffset = offset - sideLength;
  if (newOffset > 0) return reduceOffsetToMinimum(newOffset, sideLength);
  return offset;
};

const drawGridToContext = (grid, dimensions, canvas, gridColor) => {
  if (!grid) return;
  const context = canvas.getContext("2d");
  context.strokeStyle = gridColor || "rgba(0, 0, 0, .5)";
  context.lineWidth = 2;

  const sideLength = grid.sideLength * dimensions.ratio;
  const offsetX = reduceOffsetToMinimum(grid.x * dimensions.ratio, sideLength);
  const offsetY = reduceOffsetToMinimum(grid.y * dimensions.ratio, sideLength);

  for (let i = 0; i < canvas.width / sideLength; i++) {
    context.beginPath();
    context.moveTo(offsetX + i * sideLength, 0);
    context.lineTo(offsetX + i * sideLength, canvas.height);
    context.stroke();
  }
  for (let i = 0; i < canvas.height / sideLength; i++) {
    context.beginPath();
    context.moveTo(0, offsetY + i * sideLength);
    context.lineTo(canvas.width, offsetY + i * sideLength);
    context.stroke();
  }
};

export const PlayerArea = () => {
  const panZoomRef = useRef(null);
  const currentMapRef = useRef(null);
  const [currentMap, setCurrentMap] = useState(null);
  const mapId = currentMap ? currentMap.id : null;
  const socket = useSocket();
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  /**
   * used for canceling pending requests in case there is a new update incoming.
   * should be either null or an array of tasks returned by loadImage
   */
  const pendingImageLoads = useRef(null);

  const mapContainerRef = useRef(null);
  const mapCanvasRef = useRef(null);
  const objectSvgRef = useRef(null);
  const mapCanvasDimensions = useRef(null);
  /**
   * reference to the image object of the currently loaded map
   */
  const mapImageRef = useRef(null);

  const [markedAreas, setMarkedAreas] = useState(() => []);

  const centerMap = (isAnimated = true) => {
    if (!panZoomRef.current) {
      return;
    }

    panZoomRef.current.autoCenter(0.8, isAnimated);
  };

  useAsyncEffect(
    function*() {
      socket.on("connect", function() {
        console.log("connected to server");
      });

      socket.on("reconnecting", function() {
        console.log("reconnecting to server");
      });

      socket.on("reconnect", function() {
        console.log("reconnected to server");
      });

      socket.on("reconnect_failed", function() {
        console.log("reconnect failed!");
      });

      socket.on("disconnect", function() {
        console.log("disconnected from server");
      });

      const onReceiveMap = async data => {
        if (!data) {
          return;
        }

        const context = mapCanvasRef.current.getContext("2d");

        if (pendingImageLoads.current) {
          pendingImageLoads.current.forEach(task => {
            task.cancel();
          });
          pendingImageLoads.current = null;
        }

        /**
         * Hide map (show splashscreen)
         */
        if (!data.map) {
          currentMapRef.current = null;
          setCurrentMap(null);
          mapCanvasDimensions.current = null;
          mapImageRef.current = null;

          context.clearRect(
            0,
            0,
            mapCanvasRef.current.width,
            mapCanvasRef.current.height
          );
          setShowSplashScreen(true);
          return;
        }
        /**
         * Fog has updated
         */
        if (currentMapRef.current && currentMapRef.current.id === data.map.id) {
          const task = loadImage(
            `/map/${data.map.id}/fog?cache_buster=${fogCacheBusterCounter}`
          );
          fogCacheBusterCounter++;
          pendingImageLoads.current = [task];

          task.promise
            .then(fogImage => {
              pendingImageLoads.current = null;

              context.clearRect(
                0,
                0,
                mapCanvasRef.current.width,
                mapCanvasRef.current.height
              );
              context.drawImage(
                mapImageRef.current,
                0,
                0,
                mapCanvasRef.current.width,
                mapCanvasRef.current.height
              );

              if (data.map.showGridToPlayers) {
                drawGridToContext(
                  data.map.grid,
                  mapCanvasDimensions.current,
                  mapCanvasRef.current,
                  data.map.gridColor
                );
              }

              context.drawImage(
                fogImage,
                0,
                0,
                mapCanvasRef.current.width,
                mapCanvasRef.current.height
              );
            })
            .catch(err => {
              // @TODO: distinguish between network error (rertry?) and cancel error
              console.error(err);
            });
          return;
        }

        /**
         * Load new map
         */
        currentMapRef.current = data.map;
        setCurrentMap(data.map);

        const tasks = [
          loadImage(
            `/map/${data.map.id}/map?cache_buster=${fogCacheBusterCounter}`
          ),
          loadImage(
            `/map/${data.map.id}/fog?cache_buster=${fogCacheBusterCounter}`
          )
        ];
        pendingImageLoads.current = tasks;

        Promise.all(tasks.map(task => task.promise))
          .then(([map, fog]) => {
            pendingImageLoads.current = null;

            mapImageRef.current = map;
            const mapCanvas = mapCanvasRef.current;
            const objectSvg = objectSvgRef.current;
            const mapContainer = mapContainerRef.current;

            const mapContext = mapCanvas.getContext("2d");

            const canvasDimensions = getOptimalDimensions(
              map.width,
              map.height,
              Math.max(window.innerWidth, 3000),
              Math.max(window.innerHeight, 9000)
            );

            mapCanvas.width = canvasDimensions.width;
            mapCanvas.height = canvasDimensions.height;
            objectSvg.setAttribute("width", canvasDimensions.width);
            objectSvg.setAttribute("height", canvasDimensions.height);

            mapCanvasDimensions.current = canvasDimensions;

            const widthPx = `${canvasDimensions.width}px`;
            const heightPx = `${canvasDimensions.height}px`;
            mapCanvas.style.width = mapContainer.style.width = objectSvg.style.width = widthPx;
            mapCanvas.style.height = mapContainer.style.height = objectSvg.style.height = heightPx;

            mapContext.drawImage(
              map,
              0,
              0,
              canvasDimensions.width,
              canvasDimensions.height
            );
            if (data.map.showGridToPlayers) {
              drawGridToContext(
                data.map.grid,
                canvasDimensions,
                mapCanvas,
                data.map.gridColor
              );
            }
            mapContext.drawImage(
              fog,
              0,
              0,
              canvasDimensions.width,
              canvasDimensions.height
            );

            centerMap(false);
            setShowSplashScreen(false);
          })
          .catch(err => {
            // @TODO: distinguish between network error (rertry?) and cancel error
            console.error(err);
          });
      };

      const {
        data: { activeMap }
      } = yield fetch("/active-map").then(res => res.json());

      if (activeMap) {
        yield onReceiveMap({ map: activeMap });
      }

      socket.on("mark area", async data => {
        setMarkedAreas(markedAreas => [
          ...markedAreas,
          {
            id: data.id,
            x: data.x * mapCanvasDimensions.current.ratio,
            y: data.y * mapCanvasDimensions.current.ratio
          }
        ]);
      });
      let fogCacheBusterCounter = 0;

      socket.on("map update", onReceiveMap);

      const contextmenuListener = ev => {
        ev.preventDefault();
      };
      window.addEventListener("contextmenu", contextmenuListener);

      return () => {
        socket.off("connect");
        socket.off("reconnecting");
        socket.off("reconnect");
        socket.off("reconnect_failed");
        socket.off("disconnect");
        socket.off("mark area");
        socket.off("map update");

        window.removeEventListener("contextmenu", contextmenuListener);
        if (pendingImageLoads.current) {
          pendingImageLoads.current.forEach(task => {
            task.cancel();
          });
          pendingImageLoads.current = null;
        }
      };
    },
    [socket]
  );

  useEffect(() => {
    const eventName = `token:mapId:${mapId}`;
    socket.on(eventName, ({ type, data }) => {
      if (type === "add") {
        setCurrentMap(map => ({
          ...map,
          tokens: [
            ...map.tokens,
            {
              ...data.token,
              x: data.token.x,
              y: data.token.y
            }
          ]
        }));
      } else if (type === "update") {
        setCurrentMap(map => ({
          ...map,
          tokens: map.tokens.map(token => {
            if (token.id !== data.token.id) return token;
            return {
              ...token,
              ...data.token,
              x: data.token.x,
              y: data.token.y
            };
          })
        }));
      }
    });

    return () => socket.off(eventName);
  }, [socket, mapId]);

  // long press event for setting a map marker
  const longPressProps = useLongPress(ev => {
    if (!mapCanvasDimensions.current) {
      return;
    }

    let input = null;
    // ev can be a touch or click event
    if (ev.touches) {
      input = [ev.touches[0].pageX, ev.touches[0].pageY];
    } else {
      input = [ev.pageX, ev.pageY];
    }

    // calculate coordinates relative to the canvas
    const ref = new Referentiel(panZoomRef.current.getDragContainer());
    const [x, y] = ref.global_to_local(input);
    const { ratio } = mapCanvasDimensions.current;

    socket.emit("mark area", { x: x / ratio, y: y / ratio });
  }, 500);

  return (
    <>
      {showSplashScreen ? (
        <div id="splash" className="splash splash-js">
          <a id="dm-link" href="/dm">
            Dungeon Master ↝
          </a>
          <h1 className="title-text">Dungeon Revealer</h1>
        </div>
      ) : null}
      <PanZoom
        style={{
          cursor: "grab",
          background: "black",
          height: "100vh",
          width: "100vw"
        }}
        ref={panZoomRef}
        {...longPressProps}
      >
        <div ref={mapContainerRef}>
          <canvas
            ref={mapCanvasRef}
            style={{
              pointerEvents: "none",
              backfaceVisibility: "hidden",
              position: "absolute"
            }}
          />
          <ObjectLayer ref={objectSvgRef}>
            <TokenRenderer
              tokens={(currentMap && currentMap.tokens) || []}
              ratio={
                mapCanvasDimensions.current
                  ? mapCanvasDimensions.current.ratio
                  : 1
              }
            />

            <AreaMarkerRenderer
              markedAreas={markedAreas}
              setMarkedAreas={setMarkedAreas}
            />
          </ObjectLayer>
        </div>
      </PanZoom>
      {!showSplashScreen ? (
        <ToolbarContainer>
          <Toolbar horizontal>
            <Toolbar.Logo />
            <Toolbar.Group>
              <Toolbar.Item isActive>
                <Toolbar.Button
                  onClick={() => {
                    centerMap();
                  }}
                >
                  <Icons.Compass />
                  <Icons.Label>Center Map</Icons.Label>
                </Toolbar.Button>
              </Toolbar.Item>
              <Toolbar.Item isActive>
                <Toolbar.LongPressButton
                  onClick={() => {
                    if (!panZoomRef.current) {
                      return;
                    }
                    panZoomRef.current.zoomIn();
                  }}
                  onLongPress={() => {
                    const interval = setInterval(() => {
                      panZoomRef.current.zoomIn();
                    }, 100);

                    return () => clearInterval(interval);
                  }}
                >
                  <Icons.ZoomIn />
                  <Icons.Label>Zoom In</Icons.Label>
                </Toolbar.LongPressButton>
              </Toolbar.Item>
              <Toolbar.Item isActive>
                <Toolbar.LongPressButton
                  onClick={() => {
                    if (!panZoomRef.current) {
                      return;
                    }
                    panZoomRef.current.zoomOut();
                  }}
                  onLongPress={() => {
                    const interval = setInterval(() => {
                      panZoomRef.current.zoomOut();
                    }, 100);

                    return () => clearInterval(interval);
                  }}
                >
                  <Icons.ZoomOut />
                  <Icons.Label>Zoom Out</Icons.Label>
                </Toolbar.LongPressButton>
              </Toolbar.Item>
            </Toolbar.Group>
          </Toolbar>
        </ToolbarContainer>
      ) : null}
    </>
  );
};
