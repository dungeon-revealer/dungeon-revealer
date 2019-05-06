/**
 * Utility for preloading an image as a promise
 */
export const loadImage = src => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = src;
    const removeEventListeners = () => {
      image.removeEventListener("load", loadListener);
      image.removeEventListener("error", errorListener);
    };
    const loadListener = () => {
      removeEventListeners();
      resolve(image);
    };
    const errorListener = err => {
      removeEventListeners();
      reject(err);
    };
    image.addEventListener("load", loadListener);
    image.addEventListener("error", errorListener);
  });
};
