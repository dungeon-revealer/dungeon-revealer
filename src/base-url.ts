declare global {
  interface Window {
    __BASE_URL__: string | undefined;
  }
}

export const getBaseUrl = (): string => {
  if (!window.__BASE_URL__) {
    return "";
  }
  return window.__BASE_URL__;
};
