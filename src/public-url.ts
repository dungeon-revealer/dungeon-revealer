export const getPublicUrl = (): string => {
  return process.env.PUBLIC_URL;
};

export const buildUrl = (path: string) => `${getPublicUrl()}${path}`;
