export const createSplashImageState = () => {
  let _resourceId: null | string = null;

  return {
    get: () => _resourceId,
    set: (resourceId: string | null) => {
      _resourceId = resourceId;
    },
  };
};

export type SplashImageState = ReturnType<typeof createSplashImageState>;
