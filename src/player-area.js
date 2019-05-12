import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { PanZoom } from "react-easy-panzoom";
import Referentiel from "referentiel";
import { loadImage, useLongPress, getOptimalDimensions } from "./util";

const createPulsateFunction = (duration = 10000, interval = 2000) => {
  const step = duration / interval;
  const modificator = step * 2 * Math.PI;
  return t => 0.5 * Math.sin(t * modificator - Math.PI / 2) + 0.5;
};

const MarkedArea = React.memo(({ x, y, onFinishAnimation }) => {
  const circleRef = useRef(null);

  useEffect(() => {
    let id = null;

    const duration = 10500 - 1;
    const start = Date.now();
    const createValue = createPulsateFunction(duration, 1500);

    const animate = () => {
      const t = Math.max(0, Math.min((Date.now() - start) / duration, 1));
      circleRef.current.setAttribute("r", 15 + 10 * createValue(t));

      if (t >= 0.9) {
        circleRef.current.setAttribute("opacity", 1 - (t - 0.9) / 0.1);
      }
      if (t >= 1) {
        onFinishAnimation();
        return;
      }

      id = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (!id) {
        return;
      }
      cancelAnimationFrame(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <circle
      cx={x}
      cy={y}
      r="15"
      strokeWidth="5"
      stroke="red"
      fill="transparent"
      opacity="1"
      ref={circleRef}
    />
  );
});

export const PlayerArea = () => {
  const panZoomRef = useRef(null);
  const currentMapId = useRef(null);
  const socketRef = useRef(null);
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  const mapContainerRef = useRef(null);
  const mapCanvasRef = useRef(null);
  const objectSvgRef = useRef(null);
  const mapCanvasDimensions = useRef(null);
  const mapImageRef = useRef(null);

  const [markedAreas, setMarkedAreas] = useState(() => []);

  const centerMap = (isInitial = false) => {
    if (panZoomRef.current) {
      // hacky approach for centering the map initially
      // (there is no API for react-native-panzoom to do the autofocus without a transition)
      if (isInitial) {
        const transition = panZoomRef.current.dragContainer.style.transition;
        panZoomRef.current.dragContainer.style.transition = "none";
        setTimeout(() => {
          panZoomRef.current.dragContainer.style.transition = transition;
        }, 500);
      }
      panZoomRef.current.autoCenter(0.8);
    }
  };

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

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

    socket.on("map update", async data => {
      if (!data) {
        return;
      }

      const context = mapCanvasRef.current.getContext("2d");

      if (!data.mapId) {
        currentMapId.current = null;
        mapCanvasDimensions.current = null;
        mapImageRef.current = null;

        context.clearRect(
          0,
          0,
          mapCanvasRef.current.width,
          mapCanvasRef.current.height
        );
        setShowSplashScreen(true);
      } else if (currentMapId.current === data.mapId) {
        /**
         * Fog update
         */
        loadImage(data.image).then(fogImage => {
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
          context.drawImage(
            fogImage,
            0,
            0,
            mapCanvasRef.current.width,
            mapCanvasRef.current.height
          );
        });
      } else {
        /**
         * Load new map
         */
        Promise.all([
          loadImage(`/map/${data.mapId}/map`),
          loadImage(`/map/${data.mapId}/fog`)
        ]).then(([map, fog]) => {
          mapImageRef.current = map;
          const mapCanvas = mapCanvasRef.current;
          const objectSvg = objectSvgRef.current;
          const mapContainer = mapContainerRef.current;

          const mapContext = mapCanvas.getContext("2d");

          const dimensions = getOptimalDimensions(
            map.width,
            map.height,
            window.innerWidth,
            window.innerHeight
          );

          const cavasDimensions = getOptimalDimensions(
            map.width,
            map.height,
            3000,
            9000
          );

          mapCanvas.width = cavasDimensions.width;
          mapCanvas.height = cavasDimensions.height;
          objectSvg.setAttribute("width", cavasDimensions.width);
          objectSvg.setAttribute("height", cavasDimensions.height);

          mapCanvasDimensions.current = dimensions;

          mapCanvas.style.width = mapContainer.style.width = objectSvg.style.width = `${
            dimensions.width
          }px`;
          mapCanvas.style.height = mapContainer.style.height = objectSvg.style.height = `${
            dimensions.height
          }px`;

          mapContext.drawImage(
            map,
            0,
            0,
            cavasDimensions.width,
            cavasDimensions.height
          );
          mapContext.drawImage(
            fog,
            0,
            0,
            cavasDimensions.width,
            cavasDimensions.height
          );

          centerMap(true);
          setShowSplashScreen(false);
        });
      }

      currentMapId.current = data.mapId;

      const contextmenuListener = ev => {
        ev.preventDefault();
      };
      window.addEventListener("contextmenu", contextmenuListener);

      return () => {
        window.removeEventListener("contextmenu", contextmenuListener);
      };
    });
  }, []);

  useLongPress(ev => {
    if (!mapCanvasDimensions.current) {
      return;
    }

    let input = null;
    // ev can be touch or click event
    if (ev.touches) {
      input = [ev.touches[0].pageX, ev.touches[0].pageY];
    } else {
      input = [ev.pageX, ev.pageY];
    }
    // calculate coordinates relative to the canvas
    const ref = new Referentiel(panZoomRef.current.dragContainer);
    const [x, y] = ref.global_to_local(input);
    const { ratio } = mapCanvasDimensions.current;

    socketRef.current.emit("mark area", { x: x / ratio, y: y / ratio });
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
      >
        <div ref={mapContainerRef}>
          <canvas
            className="map"
            ref={mapCanvasRef}
            style={{
              pointerEvents: "none",
              backfaceVisibility: "hidden",
              position: "absolute"
            }}
          />
          <svg
            className="map"
            ref={objectSvgRef}
            style={{
              pointerEvents: "none",
              backfaceVisibility: "hidden",
              position: "absolute",
              overflow: "visible"
            }}
          >
            {markedAreas.map(markedArea => (
              <MarkedArea
                {...markedArea}
                onFinishAnimation={() => {
                  setMarkedAreas(markedAreas =>
                    markedAreas.filter(area => area.id !== markedArea.id)
                  );
                }}
                key={markedArea.id}
              />
            ))}
          </svg>
        </div>
      </PanZoom>
      {!showSplashScreen ? (
        <div id="dm-toolbar" className="toolbar-wrapper">
          <div className="btn-toolbar">
            <div className="btn-group">
              <button
                className="btn btn-default"
                onClick={() => {
                  centerMap();
                }}
              >
                Center
              </button>
              <button
                className="btn btn-default"
                onClick={() => {
                  if (!panZoomRef.current) {
                    return;
                  }
                  panZoomRef.current.zoomIn();
                }}
              >
                Zoom in
              </button>
              <button
                className="btn btn-default"
                onClick={() => {
                  if (!panZoomRef.current) {
                    return;
                  }
                  panZoomRef.current.zoomOut();
                }}
              >
                Zoom out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
