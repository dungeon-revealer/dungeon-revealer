// polyfill for browsers that do not support OffscreenCanvas
if (!window.OffscreenCanvas) {
  window.OffscreenCanvas = class OffscreenCanvas {
    constructor(width, height) {
      this.canvas = document.createElement("canvas");
      this.canvas.width = width;
      this.canvas.height = height;

      this.canvas.convertToBlob = () => {
        return new Promise((resolve) => {
          this.canvas.toBlob(resolve);
        });
      };

      return this.canvas;
    }
  };
}
