import React, { useEffect, useRef, useState } from "react";
import $ from "jquery";
import "jquery.panzoom";
import io from "socket.io-client";
import { CSSTransition } from "react-transition-group";

export const PlayerArea = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [mapContainer, mapContainerRef] = useState(null);
  const [zoomInButton, zoomInButtonRef] = useState(null);
  const [zoomOutButton, zoomOutButtonRef] = useState(null);
  const [zoomRange, zoomRangeRef] = useState(null);
  const panzoom = useRef(null);

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

  useEffect(() => {
    if (!mapContainer || !zoomInButton || !zoomOutButton || !zoomRange) {
      return;
    }
    const $map = $(mapContainer);
    panzoom.current = $map.panzoom({
      $zoomIn: $(zoomInButton),
      $zoomOut: $(zoomOutButton),
      $zoomRange: $(zoomRange),
      increment: 0.05,
      exponential: false,
      linearZoom: true,
      minScale: 0.05,
      maxScale: 20
    });

    return () => {
      $map.panzoom("destroy");
    };
  }, [mapContainer, zoomInButton, zoomOutButton, zoomRange, panzoom]);

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
      <div
        ref={mapContainerRef}
        onWheel={e => {
          e.preventDefault();
          if (!panzoom.current) {
            return;
          }

          const zoomOut = e.deltaY > 0;
          panzoom.current.panzoom("zoom", zoomOut, {
            animate: false,
            focal: e
          });
        }}
      >
        <CSSTransition in={activeMap === 1} timeout={500}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={firstMap} className="map" />
        </CSSTransition>
        <CSSTransition in={activeMap === 2} timeout={500}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={secondMap} className="map" />
        </CSSTransition>
      </div>
      {activeMap !== 0 ? (
        <div id="dm-toolbar" className="toolbar-wrapper">
          <div className="btn-toolbar">
            <div className="btn-group">
              <button ref={zoomInButtonRef} className="btn btn-default">
                Zoom in
              </button>
              <button ref={zoomOutButtonRef} className="btn btn-default">
                Zoom out
              </button>
            </div>
            <input ref={zoomRangeRef} type="range" />
          </div>
        </div>
      ) : null}
    </>
  );
};
