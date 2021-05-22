import * as React from "react";
import create from "zustand";

export type SharedTokenStateStore = {
  selectedItems: Set<string>;
  toggleSelectItem: (tokenId: string) => void;
  clearSelectedItems: () => void;
};

const createStore = () =>
  create<SharedTokenStateStore>((set, get) => ({
    selectedItems: new Set(),
    toggleSelectItem: (tokenId) => {
      const selectedItems = new Set(get().selectedItems);
      if (selectedItems.has(tokenId)) {
        selectedItems.delete(tokenId);
      } else {
        selectedItems.add(tokenId);
      }
      set({ selectedItems });
    },
    clearSelectedItems: () => {
      const state = get();
      if (state.selectedItems.size) {
        set({ selectedItems: new Set() });
      }
    },
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
