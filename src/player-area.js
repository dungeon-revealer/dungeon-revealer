import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { PanZoom } from "react-easy-panzoom";
import Referentiel from "referentiel";
import { loadImage, useLongPress } from "./util";

export const PlayerArea = () => {
  const panZoomRef = useRef(null);
  const panZoomDragContainerRef = useRef(null);
  const currentMapId = useRef(null);
  const imgMapRef = useRef(null);
  const socketRef = useRef(null);

  const [firstMap, setFirstMap] = useState(null);
  const [mapOpacity, setMapOpacity] = useState(0);
  const fogCanvasRef = useRef();

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

    socket.on("map update", async data => {
      if (!data) {
        return;
      }
      if (data.mapId === null) {
        setFirstMap(null);
        return;
      }
      if (currentMapId.current === data.mapId) {
        const context = fogCanvasRef.current.getContext("2d");

        loadImage(data.image).then(image => {
          context.clearRect(
            0,
            0,
            fogCanvasRef.current.width,
            fogCanvasRef.current.height
          );
          context.drawImage(
            image,
            0,
            0,
            fogCanvasRef.current.width,
            fogCanvasRef.current.height
          );
          setMapOpacity(1);
        });
      }

      setMapOpacity(0);

      currentMapId.current = data.mapId;
      setFirstMap(`/map/${data.mapId}/map`);
      const contextmenuListener = ev => {
        ev.preventDefault();
      };
      window.addEventListener("contextmenu", contextmenuListener);
      return () => {
        window.removeEventListener("contextmenu", contextmenuListener);
      };
    });
  }, []);

  const centerMap = () => {
    if (panZoomRef.current) {
      panZoomRef.current.autoCenter();
    }
  };

  const onLoadMap = ev => {
    centerMap();
    if (!fogCanvasRef.current) {
      return;
    }
    fogCanvasRef.current.style.width = ev.target.clientWidth + "px";
    fogCanvasRef.current.style.height = ev.target.clientHeight + "px";
    fogCanvasRef.current.width = ev.target.width;
    fogCanvasRef.current.height = ev.target.height;
    const context = fogCanvasRef.current.getContext("2d");
    loadImage(`/map/${currentMapId.current}/fog-live`).then(image => {
      context.drawImage(
        image,
        0,
        0,
        fogCanvasRef.current.width,
        fogCanvasRef.current.height
      );
      setMapOpacity(1);
    });
  };

  const mapLongPressProps = useLongPress(ev => {
    let input = null;
    // ev can be touch or click event
    if (ev.touches) {
      input = [ev.touches[0].pageX, ev.touches[0].pageY];
    } else {
      input = [ev.pageX, ev.pageY];
    }
    // calculate coordinates relative to the image
    const ref = new Referentiel(panZoomDragContainerRef.current);
    const [x, y] = ref.global_to_local(input);
    const { width, height } = imgMapRef.current;
    if (x > width || x < 0 || y > height || y < 0) {
      return;
    }
    socketRef.current.emit("mark area", { x, y });
  }, 500);

  return (
    <>
      {firstMap === null ? (
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
          background: "black"
        }}
        ref={panZoomRef}
        onDragContainerRef={ref => {
          panZoomDragContainerRef.current = ref;
        }}
        {...mapLongPressProps}
      >
        <div
          style={{
            height: "100vh",
            width: "100vw",
            position: "relative",
            pointerEvents: "none",
            background: "red"
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img
            src={firstMap}
            className="map"
            onLoad={onLoadMap}
            style={{ opacity: mapOpacity }}
            ref={imgMapRef}
          />
          <canvas className="map" ref={fogCanvasRef} />
        </div>
      </PanZoom>
      {firstMap !== null ? (
        <div id="dm-toolbar" className="toolbar-wrapper">
          <div className="btn-toolbar">
            <div className="btn-group">
              <button className="btn btn-default" onClick={centerMap}>
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
