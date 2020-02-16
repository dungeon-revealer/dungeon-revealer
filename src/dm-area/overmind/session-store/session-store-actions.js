export const setAccessToken = ({ state }, accessToken) => {
  state.sessionStore.accessToken = accessToken;
};
