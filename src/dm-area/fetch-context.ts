import React, { useContext } from "react";

export const FetchContext = React.createContext(fetch);

/**
 * inject fetch with authorization headers into the component tree
 */
export const useFetch = () => useContext(FetchContext);
