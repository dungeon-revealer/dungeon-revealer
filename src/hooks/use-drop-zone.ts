import * as React from "react";

type FilesDroppedHandler = (params: {
  files: Array<File>;
  position: { x: number; y: number };
}) => void;

type Handlers<THTMLElement extends HTMLElement> = {
  onDragEnter: (ev: React.DragEvent<THTMLElement>) => void;
  onDragLeave: (ev: React.DragEvent<THTMLElement>) => void;
  onDragOver: (ev: React.DragEvent<THTMLElement>) => void;
  onDrop: (ev: React.DragEvent<THTMLElement>) => void;
};

export const isFileDrag = (ev: React.DragEvent) => {
  if (ev.dataTransfer.types && ev.dataTransfer.types.includes("Files")) {
    return true;
  }

  if (ev.dataTransfer.files.length > 0) {
    return true;
  }

  return false;
};

export const useDropZone = <THTMLElement extends HTMLElement>(
  onFilesDropped: FilesDroppedHandler
): [Handlers<THTMLElement>] => {
  const handlers: Handlers<THTMLElement> = React.useMemo(
    () => ({
      onDragEnter: (ev) => {
        ev.preventDefault();
        if (isFileDrag(ev) === false) {
          return;
        }
        ev.dataTransfer.dropEffect = "copy";
      },
      onDragLeave: (ev) => {
        ev.preventDefault();
        if (isFileDrag(ev) === false) {
          return;
        }
      },
      onDragOver: (ev) => {
        ev.preventDefault();
      },
      onDrop: (ev) => {
        ev.preventDefault();
        if (isFileDrag(ev) === false) {
          return;
        }

        const files = Array.from(ev.dataTransfer.files);
        if (files.length > 0) {
          onFilesDropped({
            files,
            position: {
              x: ev.clientX,
              y: ev.clientY,
            },
          });
        }
      },
    }),
    [onFilesDropped]
  );

  return [handlers];
};
