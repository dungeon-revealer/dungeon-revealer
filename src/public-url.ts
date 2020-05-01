import once from "lodash/once";

export const getPublicUrl = once((): string => {
  const publicUrl = document
    .querySelector("base")
    ?.getAttribute("href")
    ?.replace(/\/$/, "");
  if (!publicUrl || publicUrl === "__PUBLIC_URL_PLACEHOLDER__") return "";
  return publicUrl;
});

export const getUrlPrefix = once((): string => {
  const publicUrl = getPublicUrl();
  if (publicUrl === "") return "";
  const pathname = new URL(publicUrl).pathname;
  return pathname === "/" ? "" : pathname;
});

export const buildUrl = (path: string) => `${getUrlPrefix()}${path}`;
export const buildApiUrl = (path: string) => buildUrl(`/api${path}`);

export const getPublicHost = (): string => {
  return `${window.location.protocol}//${window.location.host}`;
};
