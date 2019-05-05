/**
 * Utility for preoloading an image as a promise
 */
export const loadImage = src => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = src;
    const loadListener = () => {
      resolve(image);
      image.removeEventListener("load", loadListener);
    };
    const errorListener = err => {
      reject(err);
      image.removeEventListener("error", errorListener);
    };
    image.addEventListener("load", loadListener);
    image.addEventListener("error", errorListener);
  });
};
