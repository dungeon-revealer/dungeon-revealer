import * as React from "react";

export type LoadImageTask = {
  promise: Promise<HTMLImageElement>;
  cancel: () => void;
};
/**
 * Utility for preloading an image as a promise
 */
export const loadImage = (src: string) => {
  const image = new Image();
  let isLoaded = false;

  const cancel = () => {
    if (isLoaded) {
      return;
    }
    image.src = "";
  };

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    image.src = src;
    const removeEventListeners = () => {
      image.removeEventListener("load", loadListener);
      image.removeEventListener("error", errorListener);
    };
    const loadListener = () => {
      removeEventListeners();
      isLoaded = true;
      resolve(image);
    };
    const errorListener = (err: unknown) => {
      removeEventListeners();
      reject(err);
    };
    image.addEventListener("load", loadListener);
    image.addEventListener("error", errorListener);
  });

  return { promise, cancel };
};

/**
 * calculate the optimal dimensions for an area while kepping the aspect ratio
 * @param {number} idealWidth
 * @param {number} idealHeight
 * @param {number} maxWidth
 * @param {number} maxHeight
 */
export const getOptimalDimensions = (
  idealWidth: number,
  idealHeight: number,
  maxWidth: number,
  maxHeight: number
) => {
  const ratio = Math.min(maxWidth / idealWidth, maxHeight / idealHeight);
  if (ratio > 1) {
    return {
      ratio: 1,
      width: idealWidth,
      height: idealHeight,
    };
  }

  return {
    ratio: ratio,
    width: idealWidth * ratio,
    height: idealHeight * ratio,
  };
};

export const ConditionalWrap: React.FC<{
  condition: boolean;
  wrap: (children: React.ReactNode) => React.ReactElement;
}> = ({ condition, wrap, children }) =>
  condition
    ? wrap(children)
    : React.createElement(React.Fragment, { children });
