import { Action } from "overmind";

export const setAccessToken: Action<string | null> = (
  { state },
  accessToken
) => {
  state.sessionStore.accessToken = accessToken;
};
