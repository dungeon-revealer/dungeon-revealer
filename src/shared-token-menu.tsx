import * as React from "react";
import { animated, to } from "@react-spring/web";
import { useControls, useCreateStore, LevaInputs } from "leva";
import { ThemedLevaPanel } from "./themed-leva-panel";
import { ChatPositionContext } from "./authenticated-app-shell";
import { useSelectedItems, useTokenLevaStore } from "./shared-token-state";
import { levaPluginTokenImage } from "./leva-plugin/leva-plugin-token-image";

export const SharedTokenMenu = () => {
  const chatPosition = React.useContext(ChatPositionContext);
  const store = useTokenLevaStore();
  const [selectedItems] = useSelectedItems();

  return (
    <animated.div
      style={{
        position: "absolute",
        bottom: 100,
        right:
          chatPosition !== null
            ? to(chatPosition.x, (value) => -value + 10 + chatPosition.width)
            : 10,
        // @ts-ignore
        zIndex: 1,
        width: 300,
      }}
      onKeyDown={(ev) => ev.stopPropagation()}
    >
      {selectedItems.size === 0 ? (
        <ThemedLevaPanel
          store={store}
          fill={true}
          hideCopyButton
          titleBar={{
            filter: false,
            drag: false,
            title: "Token Properties",
          }}
        />
      ) : (
        <MultiTokenPanel />
      )}
    </animated.div>
  );
};

const MultiTokenPanel = () => {
  const store = useCreateStore();
  const [selectedItems] = useSelectedItems();

  const allSelectedItemsRef = React.useRef(selectedItems);
  React.useEffect(() => {
    allSelectedItemsRef.current = selectedItems;
  });

  let tokenImageId: null | string = null;
  for (const store of selectedItems.values()) {
    let currentTokenImageId = store.get("tokenImageId");
    if (currentTokenImageId) {
      tokenImageId = currentTokenImageId;
      break;
    }
  }

  const [, set] = useControls(
    () => {
      const firstItem = selectedItems.values().next().value;

      return {
        color: {
          type: LevaInputs.COLOR,
          label: "Color",
          value: firstItem.get("color"),
          onChange: (color: string, _, { initial, fromPanel }) => {
            if (initial || !fromPanel) {
              return;
            }
            for (const [tokenId, store] of allSelectedItemsRef.current) {
              // TODO: persist on server
              store.set({ color }, false);
            }
          },
        },
        isVisibleForPlayers: {
          type: LevaInputs.BOOLEAN,
          label: "Visible to players",
          value: firstItem.get("isVisibleForPlayers"),
          onChange: (
            isVisibleForPlayers: boolean,
            _,
            { initial, fromPanel }
          ) => {
            if (initial || !fromPanel) {
              return;
            }
            for (const [tokenId, store] of allSelectedItemsRef.current) {
              // TODO: persist on server
              store.set({ isVisibleForPlayers }, false);
            }
          },
        },
        isMovableByPlayers: {
          type: LevaInputs.BOOLEAN,
          label: "Movable by players",
          value: firstItem.get("isMovableByPlayers"),
          onChange: (
            isMovableByPlayers: boolean,
            _,
            { initial, fromPanel }
          ) => {
            if (initial || !fromPanel) {
              return;
            }
            for (const [tokenId, store] of allSelectedItemsRef.current) {
              // TODO: persist on server
              store.set({ isMovableByPlayers }, false);
            }
          },
        },
        tokenImageId: levaPluginTokenImage({
          value: tokenImageId,
          onChange: (
            tokenImageId: null | string,
            _,
            { initial, fromPanel }
          ) => {
            if (initial || !fromPanel) {
              return;
            }
            for (const [tokenId, store] of allSelectedItemsRef.current) {
              // TODO: persist on server
              store.set({ tokenImageId }, false);
            }
          },
          transient: false,
        }),
      };
    },
    { store }
  );

  // Workaround as dependency array does not seem to work atm :(
  React.useEffect(() => {
    set({ tokenImageId });
  }, [tokenImageId]);

  return (
    <ThemedLevaPanel
      store={store}
      fill={true}
      hideCopyButton
      titleBar={{
        filter: false,
        drag: false,
        title: `${selectedItems.size} Token selected`,
      }}
    />
  );
};
