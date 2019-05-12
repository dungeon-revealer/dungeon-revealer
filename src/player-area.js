import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { PanZoom } from "react-easy-panzoom";
import Referentiel from "referentiel";
import { loadImage, useLongPress } from "./util";

const getOptimalDimensions = (idealWidth, idealHeight, maxWidth, maxHeight) => {
  const ratio = Math.min(maxWidth / idealWidth, maxHeight / idealHeight);

  return {
    ratio: ratio,
    width: idealWidth * ratio,
    height: idealHeight * ratio
  };
};

export const PlayerArea = () => {
  const panZoomRef = useRef(null);
  const panZoomDragContainerRef = useRef(null);
  const currentMapId = useRef(null);
  const socketRef = useRef(null);
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  const mapCanvasRef = useRef(null);
  const mapCanvasDimensions = useRef(null);
  const mapImageRef = useRef(null);

  const centerMap = (isInitial = false) => {
    if (panZoomRef.current) {
      // hacky approach for centering the map initially
      // (there is no API for react-native-panzoom to do the autofocus without a transition)
      if (isInitial) {
        const transition = panZoomDragContainerRef.current.style.transition;
        panZoomDragContainerRef.current.style.transition = "none";
        setTimeout(() => {
          panZoomDragContainerRef.current.style.transition = transition;
        }, 200);
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

    socket.on("mark area", async data => {});

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

          mapCanvasDimensions.current = dimensions;
          mapCanvas.style.width = `${dimensions.width}px`;
          mapCanvas.style.height = `${dimensions.height}px`;

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
    const ref = new Referentiel(panZoomDragContainerRef.current);
    const [x, y] = ref.global_to_local(input);
    const { width, height, ratio } = mapCanvasDimensions.current;

    if (x > width || x < 0 || y > height || y < 0) {
      return;
    }
    // Press was on the map, calculate actual image position next
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
        onDragContainerRef={ref => {
          panZoomDragContainerRef.current = ref;
        }}
      >
        <canvas
          className="map"
          ref={mapCanvasRef}
          style={{ pointerEvents: "none", backfaceVisibility: "hidden" }}
        />
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
