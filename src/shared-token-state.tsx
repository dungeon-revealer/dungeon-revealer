import * as React from "react";
import create from "zustand";
import { StoreType as LevaStoreType } from "leva/dist/declarations/src/types";

export type SharedTokenStateStore = {
  selectedItems: Map<string, LevaStoreType>;
  toggleSelectItem: (tokenId: string, store: LevaStoreType) => void;
  clearSelectedItems: () => void;
  removeSelectItem: (tokenId: string) => void;
  tokenLevaStore: LevaStoreType | null;
  setTokenLevaStore: (store: LevaStoreType | null) => void;
};

const createStore = () =>
  create<SharedTokenStateStore>((set, get) => ({
    selectedItems: new Map(),
    toggleSelectItem: (tokenId, store) => {
      const selectedItems = new Map(get().selectedItems);
      if (selectedItems.has(tokenId)) {
        selectedItems.delete(tokenId);
      } else {
        selectedItems.set(tokenId, store);
      }
      set({ selectedItems });
    },
    clearSelectedItems: () => {
      const state = get();
      if (state.selectedItems.size) {
        set({ selectedItems: new Map() });
      }
    },
    removeSelectItem: (tokenId) => {
      const state = get();
      if (state.selectedItems.has(tokenId)) {
        const selectedItems = new Map(state.selectedItems);
        selectedItems.delete(tokenId);
        set({ selectedItems });
      }
    },
    tokenLevaStore: null,
    setTokenLevaStore: (tokenLevaStore) => set({ tokenLevaStore }),
  }));

export const SharedTokenStateStoreContext =
  React.createContext<ReturnType<typeof createStore> | null>(null);

type ArrayOrOne<T> = T | Array<T>;

export const SharedTokenStateProvider = (props: {
  children: ArrayOrOne<React.ReactElement | React.ReactNode | null>;
}) => {
  const [store] = React.useState(createStore);
  return (
    <SharedTokenStateStoreContext.Provider value={store}>
      {props.children}
    </SharedTokenStateStoreContext.Provider>
  );
};

const useSharedTokenStateStore = () =>
  React.useContext(SharedTokenStateStoreContext);

const useSharedTokenStateStoreStrict = () => {
  const store = useSharedTokenStateStore();
  if (!store) {
    throw new Error("Store is not present.");
  }

  return store;
};

type TokenSelectionSelectorResult = {
  isSelected: boolean;
  toggleItem: SharedTokenStateStore["toggleSelectItem"];
  clearSelectedItems: SharedTokenStateStore["clearSelectedItems"];
};

const createTokenSelectionSelector =
  (tokenId: string) =>
  (store: SharedTokenStateStore): TokenSelectionSelectorResult => ({
    isSelected: store.selectedItems.has(tokenId),
    toggleItem: store.toggleSelectItem,
    clearSelectedItems: store.clearSelectedItems,
  });
const noop = () => undefined;
const noopTokenSelection: TokenSelectionSelectorResult = {
  isSelected: false,
  toggleItem: noop,
  clearSelectedItems: noop,
};

export const useTokenSelection = (
  tokenId: string
): TokenSelectionSelectorResult => {
  const selector = React.useMemo(
    () => createTokenSelectionSelector(tokenId),
    [tokenId]
  );
  const store = useSharedTokenStateStore();

  // ensure cleanup when the token is unmounted.
  React.useEffect(
    () => () => {
      if (store) {
        store.getState().removeSelectItem(tokenId);
      }
    },
    [tokenId]
  );
  return store ? store(selector) : noopTokenSelection;
};

const clearTokenSelectionSelector = (store: SharedTokenStateStore) =>
  store.clearSelectedItems;

export const useClearTokenSelection = () =>
  useSharedTokenStateStore()?.(clearTokenSelectionSelector) ?? noop;

const selectedItemsSelector = (store: SharedTokenStateStore) =>
  [store.selectedItems, store.clearSelectedItems] as const;
export const useSelectedItems = () =>
  useSharedTokenStateStoreStrict()(selectedItemsSelector);

const tokenLevaStoreSelector = (store: SharedTokenStateStore) =>
  store.tokenLevaStore;
export const useTokenLevaStore = () =>
  useSharedTokenStateStoreStrict()(tokenLevaStoreSelector);

const setTokenLevaStoreSelector = (store: SharedTokenStateStore) =>
  store.setTokenLevaStore;
export const useSetTokenLevaStore = () =>
  useSharedTokenStateStore()?.(setTokenLevaStoreSelector) ?? noop;
