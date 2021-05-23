import * as React from "react";
import create from "zustand";
import { MapTokenEntity } from "./map-typings";

export type ContextMenuState = {
  clientPosition: {
    x: number;
    y: number;
  };
  imagePosition: {
    x: number;
    y: number;
  };
  target: null | {
    type: "token";
    id: string;
  };
} | null;

export type ContextMenuStore = {
  state: ContextMenuState;
  copyContent: Set<MapTokenEntity>;
  showContextMenu: (state: ContextMenuState) => void;
  setCopyContent: (content: Set<MapTokenEntity>) => void;
};

const createStore = () =>
  create<ContextMenuStore>((set) => ({
    state: null,
    copyContent: new Set(),
    showContextMenu: (state) => set({ state }),
    setCopyContent: (copyContent) => set({ copyContent }),
  }));

export const ContextMenuStoreContext =
  React.createContext<ReturnType<typeof createStore> | null>(null);

type ArrayOrOne<T> = T | Array<T>;

export const ContextMenuStoreProvider = (props: {
  children: ArrayOrOne<React.ReactElement | React.ReactNode | null>;
}) => {
  const [store] = React.useState(createStore);
  return (
    <ContextMenuStoreContext.Provider value={store}>
      {props.children}
    </ContextMenuStoreContext.Provider>
  );
};

const useContextMenuStore = () => React.useContext(ContextMenuStoreContext);
const useContextMenuStoreStrict = () => {
  const store = useContextMenuStore();
  if (!store) {
    throw new Error("Store is not present.");
  }

  return store;
};

const storeStateSelector = (store: ContextMenuStore) => store.state;

export const useContextMenuState = () =>
  useContextMenuStoreStrict()(storeStateSelector);

const showContextMenuSelector = (store: ContextMenuStore) =>
  store.showContextMenu;

const noop = () => undefined;

export const useShowContextMenu = () => {
  const store = useContextMenuStore();
  return store ? store(showContextMenuSelector) : noop;
};

export const useContextMenu = () => useContextMenuStoreStrict()();
