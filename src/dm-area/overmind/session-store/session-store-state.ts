export type SessionStoreStateType = {
  accessToken: null | string;
};

const createStore = (): SessionStoreStateType => ({
  accessToken: null
});

export const state = createStore();
