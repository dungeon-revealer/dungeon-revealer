import once from "lodash/once";

export const getPublicUrl = (): string => {
  return process.env.PUBLIC_URL;
};

const getUrlPrefix = once((): string => {
  const publicUrl = getPublicUrl();
  if (publicUrl.length === 0 || publicUrl.startsWith("/")) {
    return publicUrl;
  }
  const url = new URL(publicUrl);
  return url.pathname;
});

export const buildUrl = (path: string) => `${getUrlPrefix()}${path}`;
export const buildApiUrl = (path: string) => buildUrl(`/api${path}`);

export const getPublicHost = (): string => {
  return `${window.location.protocol}//${window.location.host}`;
};
