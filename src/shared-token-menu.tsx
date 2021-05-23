import * as React from "react";
import { animated, to } from "@react-spring/web";
import { useControls, useCreateStore, LevaInputs } from "leva";
import graphql from "babel-plugin-relay/macro";
import { useMutation } from "relay-hooks";
import { ThemedLevaPanel } from "./themed-leva-panel";
import { ChatPositionContext } from "./authenticated-app-shell";
import { useSelectedItems } from "./shared-token-state";
import { levaPluginTokenImage } from "./leva-plugin/leva-plugin-token-image";
import type { sharedTokenMenuUpdateManyMapTokenMutation } from "./__generated__/sharedTokenMenuUpdateManyMapTokenMutation.graphql";

const firstMapValue = <TItemValue extends any>(
  map: Map<any, TItemValue>
): TItemValue => map.values().next().value as TItemValue;

export const SharedTokenMenu = (props: { currentMapId: string }) => {
  const chatPosition = React.useContext(ChatPositionContext);
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
      {selectedItems.size === 0 ? null : selectedItems.size === 1 ? (
        <ThemedLevaPanel
          store={firstMapValue(selectedItems)}
          fill={true}
          hideCopyButton
          titleBar={{
            filter: false,
            drag: false,
            title: "Token Properties",
          }}
        />
      ) : (
        <MultiTokenPanel currentMapId={props.currentMapId} />
      )}
    </animated.div>
  );
};

const SharedTokenMenuUpdateManyMapTokenMutation = graphql`
  mutation sharedTokenMenuUpdateManyMapTokenMutation(
    $input: MapTokenUpdateManyInput!
  ) {
    mapTokenUpdateMany(input: $input)
  }
`;

const MultiTokenPanel = (props: { currentMapId: string }) => {
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
      tokenImageId = "__ID_THAT_WILL_NOT_COLLIDE_SO_WE_CAN_CHOOSE_ANY_IMAGE__";
      break;
    }
  }

  const [mutate] = useMutation<sharedTokenMenuUpdateManyMapTokenMutation>(
    SharedTokenMenuUpdateManyMapTokenMutation
  );

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
            for (const store of allSelectedItemsRef.current.values()) {
              store.set({ color }, false);
            }
          },
          onEditEnd: (color: string) => {
            mutate({
              variables: {
                input: {
                  mapId: props.currentMapId,
                  tokenIds: Array.from(allSelectedItemsRef.current.keys()),
                  properties: {
                    color,
                  },
                },
              },
            });
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
            for (const store of allSelectedItemsRef.current.values()) {
              store.set({ isVisibleForPlayers }, false);
            }
            mutate({
              variables: {
                input: {
                  mapId: props.currentMapId,
                  tokenIds: Array.from(allSelectedItemsRef.current.keys()),
                  properties: {
                    isVisibleForPlayers,
                  },
                },
              },
            });
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
            for (const store of allSelectedItemsRef.current.values()) {
              store.set({ isMovableByPlayers }, false);
            }
            mutate({
              variables: {
                input: {
                  mapId: props.currentMapId,
                  tokenIds: Array.from(allSelectedItemsRef.current.keys()),
                  properties: {
                    isMovableByPlayers,
                  },
                },
              },
            });
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
            for (const store of allSelectedItemsRef.current.values()) {
              store.set({ tokenImageId }, false);
            }
            mutate({
              variables: {
                input: {
                  mapId: props.currentMapId,
                  tokenIds: Array.from(allSelectedItemsRef.current.keys()),
                  properties: {
                    tokenImageId,
                  },
                },
              },
            });
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
