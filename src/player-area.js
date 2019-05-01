import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { CSSTransition } from "react-transition-group";
import { PanZoom } from "react-easy-panzoom";

export const PlayerArea = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  const didCenterMapInitially = useRef(false);
  const panZoomRef = useRef(null);

  const activeMapIndex = useRef(0);

  const [firstMap, setFirstMap] = useState(null);
  const [secondMap, setSecondMap] = useState(null);
  const [activeMap, setActiveMap] = useState(0);

  useEffect(() => {
    activeMapIndex.current = activeMap;
  }, [activeMap]);

  useEffect(() => {
    const socket = io();

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

    socket.on("map update", msg => {
      setShowSplashScreen(false);
      console.log("got a map update");
      if (!msg || !msg.imageData) {
        return;
      }
      if (activeMapIndex.current === 1) {
        setSecondMap(msg.imageData);
        setActiveMap(2);
      } else {
        setFirstMap(msg.imageData);
        setActiveMap(1);
      }
    });
  }, []);

  /**
   *
   */
  const centerMap = () => {
    if (panZoomRef.current) {
      panZoomRef.current.autoCenter();
    }
  };

  const centerMapInitially = () => {
    if (didCenterMapInitially.current) {
      return;
    }
    didCenterMapInitially.current = true;
    centerMap();
  };

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
          cursor: "grab"
        }}
        ref={panZoomRef}
      >
        <div
          style={{
            height: "100vh",
            width: "100vw",
            position: "relative",
            pointerEvents: "none"
          }}
        >
          <CSSTransition in={activeMap === 1} timeout={500}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img src={firstMap} className="map" onLoad={centerMapInitially} />
          </CSSTransition>
          <CSSTransition in={activeMap === 2} timeout={500}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img src={secondMap} className="map" onLoad={centerMapInitially} />
          </CSSTransition>
        </div>
      </PanZoom>
      {activeMap !== 0 ? (
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
