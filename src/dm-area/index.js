import React, { useState, useEffect } from "react";
import { DmMap } from "./dm-map";

const uploadFile = async file => {
  const formData = new FormData();

  formData.append("file", file);
  const res = await fetch("/upload", {
    method: "POST",
    body: formData
  });
  return res.ok;
};
const checkMapExistence = async () => {
  const res = await fetch("/dm/map");
  return res.ok;
};

const Dropzone = ({ onSelectFile }) => {
  const [isFileDragInProcess, setIsFileDragInProcess] = useState(false);

  return (
    <label
      style={{
        display: "block",
        minHeight: 150,
        border: "2px solid rgba(0,0,0,0.3)",
        background: "white",
        padding: "20px 20px",
        cursor: "pointer"
      }}
      onDragOver={ev => {
        setIsFileDragInProcess(true);
        ev.stopPropagation();
        ev.preventDefault();
      }}
      onDragEnd={() => {
        setIsFileDragInProcess(false);
      }}
      onDragLeave={() => {
        setIsFileDragInProcess(false);
      }}
      onDrop={ev => {
        ev.preventDefault();
        setIsFileDragInProcess(false);
        if (ev.dataTransfer.items) {
          const files = Array.from(ev.dataTransfer.items)
            .filter(item => {
              return item.kind === "file";
            })
            .map(item => item.getAsFile())
            .filter(Boolean);

          const [file] = files;
          if (!file) {
            return;
          }
          onSelectFile(file);
        }
      }}
    >
      <input
        style={{ opacity: 0, width: 0, height: 0, overflow: "hidden" }}
        accept=".jpeg,.jpg,.svg,.png"
        type="file"
        id="upload"
        className="dropzone"
        onChange={({ target }) => {
          if (target.files) {
            const files = Array.from(target.files);
            const [file] = files;
            if (!file) {
              return;
            }
            onSelectFile(file);
          }
        }}
      />
      <div style={{ marginTop: "45px", textAlign: "center" }}>
        {isFileDragInProcess
          ? "Drop your file here"
          : "Click here or drag and drop an image to upload"}
      </div>
    </label>
  );
};

export const DmArea = () => {
  const [hasMap, setHasMap] = useState(false);

  useEffect(() => {
    checkMapExistence().then(hasMap => {
      if (hasMap) {
        setHasMap(true);
      }
    });
  }, []);

  return (
    <>
      <div className="navbar navbar-inverse">
        <div className="navbar-header">
          <button
            className="navbar-toggle"
            type="button"
            data-toggle="collapse"
            data-target=".navbar-inverse-collapse"
          >
            <span className="icon-bar" />
            <span className="icon-bar" />
            <span className="icon-bar" />
          </button>
          <a href="/" className="navbar-brand">
            Dungeon Revealer
          </a>
        </div>
        <div
          id="#bs-example-navbar-collapse-2"
          className="collapse navbar-collapse"
        >
          <form className="navbar-form navbar-left" role="search">
            <button
              id="btn-new-map"
              className="btn btn-default"
              type="button"
              onClick={() => {
                setHasMap(false);
              }}
            >
              New Map
            </button>
          </form>
        </div>
      </div>
      {hasMap ? (
        <DmMap />
      ) : (
        <Dropzone
          onSelectFile={async file => {
            await uploadFile(file);
            setHasMap(true);
          }}
        />
      )}
    </>
  );
};
