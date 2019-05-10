import React, { useState, useRef } from "react";
import { Modal } from "./modal";

const AddIcon = props => {
  return (
    <svg viewBox="0 0 533.333 533.333" {...props}>
      <path d="M516.667 200H333.333V16.667C333.333 7.462 325.871 0 316.667 0h-100C207.462 0 200 7.462 200 16.667V200H16.667C7.462 200 0 207.462 0 216.667v100c0 9.204 7.462 16.666 16.667 16.666H200v183.334c0 9.204 7.462 16.666 16.667 16.666h100c9.204 0 16.667-7.462 16.667-16.666V333.333h183.333c9.204 0 16.667-7.462 16.667-16.666v-100c-.001-9.205-7.463-16.667-16.667-16.667z" />
    </svg>
  );
};

const EditIcon = props => (
  <svg viewBox="0 0 383.947 383.947" {...props}>
    <path d="M0 303.947v80h80l236.053-236.054-80-80zM377.707 56.053L327.893 6.24c-8.32-8.32-21.867-8.32-30.187 0l-39.04 39.04 80 80 39.04-39.04c8.321-8.32 8.321-21.867.001-30.187z" />
  </svg>
);

const CreateNewMapButton = ({ onSelectFile }) => {
  const fileInputRef = useRef();
  return (
    <>
      <button
        className="btn btn-default"
        onClick={() => {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
      >
        <AddIcon height={15} width={15} /> Create new map
      </button>
      <input
        type="file"
        style={{ display: "none" }}
        ref={fileInputRef}
        accept=".jpeg,.jpg,.svg,.png"
        onChange={ev => {
          if (!ev.target.files) {
            return;
          }
          const [file] = ev.target.files;
          if (!file) {
            return;
          }
          onSelectFile(file);
        }}
      />
    </>
  );
};

export const SelectMapModal = ({
  onClickOutside,
  setLoadedMapId,
  maps,
  liveMapId,
  loadedMapId,
  deleteMap,
  updateMap,
  createMap
}) => {
  const [activeMapId, setActiveMapId] = useState(loadedMapId);
  let activeMap = null;
  if (activeMapId) {
    activeMap = maps.find(map => map.id === activeMapId) || null;
  }

  const beforeCreateMap = file => {
    const title = (window.prompt("Please choose a map name") || "").trim();
    if (title) {
      createMap({ file, title });
    } else {
      alert("Please enter a valid title");
    }
  };

  return (
    <Modal onClickOutside={onClickOutside}>
      <Modal.Dialog>
        <Modal.Header style={{ display: "flex", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Maps</h2>
          <div style={{ flex: 1, textAlign: "right" }}>
            <CreateNewMapButton
              onSelectFile={file => {
                beforeCreateMap(file);
              }}
            />
            <button
              className="btn btn-default"
              style={{ marginLeft: 8 }}
              onClick={onClickOutside}
            >
              Close
            </button>
          </div>
        </Modal.Header>
        <Modal.Body style={{ display: "flex", height: "80vh" }}>
          <div
            style={{
              overflow: "scroll",
              maxWidth: "30%",
              width: "100%",
              borderRight: "1px solid rgba(0,0,0,.1)"
            }}
          >
            <ul style={{ padding: 0, listStyle: "none" }}>
              {maps.map(item => (
                <li key={item.id}>
                  <button
                    style={{
                      display: "block",
                      width: "100%",
                      border: "none",
                      textAlign: "left",
                      padding: 10,
                      cursor: "pointer",
                      textDecoration: "none",
                      paddingLeft: 20,
                      paddingRight: 20,
                      ...(item.id === activeMapId
                        ? {
                            fontWeight: "bold",
                            backgroundColor: "rgba(0, 0, 0, 0.1)"
                          }
                        : {
                            backgroundColor: "rgba(255, 255, 255, 1)"
                          })
                    }}
                    onClick={() => {
                      setActiveMapId(item.id);
                    }}
                  >
                    {item.title} {item.id === liveMapId ? "(live)" : null}
                  </button>
                </li>
              ))}
            </ul>
            <div />
          </div>
          <div style={{ flex: 1 }}>
            {activeMap ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  width: "100%"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingTop: 8,
                    paddingBottom: 16
                  }}
                >
                  <h3 style={{ margin: 0, marginRight: 16 }}>
                    {activeMap.title}
                  </h3>
                  <div>
                    <button
                      className="btn btn-default btn-sm"
                      onClick={() => {
                        const title = window.prompt(
                          "Please enter the new map title"
                        );
                        updateMap(activeMap.id, { title });
                      }}
                    >
                      <EditIcon height={12} width={12} /> Edit
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    height: "100%",
                    width: "100%",
                    overflowY: "scroll"
                  }}
                >
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img
                    src={`/map/${activeMap.id}/map`}
                    style={{ width: "100%" }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingTop: 8,
                    paddingBottom: 16
                  }}
                >
                  <div>
                    <button
                      className="btn btn-default"
                      onClick={() => {
                        const result = window.confirm(
                          "Do you really want to delete this map?"
                        );

                        if (!result) {
                          return;
                        }

                        deleteMap(activeMap.id);
                        setActiveMapId(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ marginLeft: "auto" }}>
                    <button
                      className="btn btn-success"
                      onClick={() => {
                        setLoadedMapId(activeMap.id);
                      }}
                    >
                      Load
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </Modal.Body>
      </Modal.Dialog>
    </Modal>
  );
};
