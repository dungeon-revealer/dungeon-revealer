import * as React from "react";

const Context = React.createContext<string | null>(null);

export const AccessTokenProvider = Context.Provider;
export const useAccessToken = () => React.useContext(Context);
