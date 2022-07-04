import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { useFragment, useMutation } from "relay-hooks";
import { Box, Menu, MenuItem, MenuList } from "@chakra-ui/react";
import { MapTokenEntity } from "./map-typings";
import { useContextMenu } from "./map-context-menu";
import { useSelectedItems } from "./shared-token-state";
import { mapContextMenuRendererMapTokenRemoveManyMutation } from "./__generated__/mapContextMenuRendererMapTokenRemoveManyMutation.graphql";
import {
  mapContextMenuRendererMapTokenAddManyMutation,
  MapTokenAddManyTokenInput,
} from "./__generated__/mapContextMenuRendererMapTokenAddManyMutation.graphql";
import { mapContextMenuRenderer_MapFragment$key } from "./__generated__/mapContextMenuRenderer_MapFragment.graphql";

const MapContextMenuRendererMapTokenRemoveManyMutation = graphql`
  mutation mapContextMenuRendererMapTokenRemoveManyMutation(
    $input: MapTokenRemoveManyInput!
  ) {
    mapTokenRemoveMany(input: $input)
  }
`;

const MapContextMenuRendererMapTokenAddManyMutation = graphql`
  mutation mapContextMenuRendererMapTokenAddManyMutation(
    $input: MapTokenAddManyInput!
  ) {
    mapTokenAddMany(input: $input)
  }
`;

const MapFragment = graphql`
  fragment mapContextMenuRenderer_MapFragment on Map {
    id
    tokens {
      id
      x
      y
      rotation
      color
      label
      radius
      isVisibleForPlayers
      isMovableByPlayers
      isLight
      lightRadius
      isLocked
      tokenImage {
        id
      }
      referenceId
    }
  }
`;

export const ContextMenuRenderer = (props: {
  map: mapContextMenuRenderer_MapFragment$key;
}) => {
  const map = useFragment(MapFragment, props.map);

  const getTokens = React.useCallback(
    (tokenIds: Set<string>) => {
      const hits = new Map<string, MapTokenEntity>();
      for (const token of map.tokens) {
        if (tokenIds.has(token.id)) {
          hits.set(token.id, {
            ...token,
            tokenImageId: token.tokenImage?.id ?? null,
            reference: token.referenceId
              ? {
                  id: token.referenceId,
                  type: "note",
                }
              : null,
          });
        }
      }
      return hits;
    },
    [map.tokens]
  );

  const { state, copyContent, showContextMenu, setCopyContent } =
    useContextMenu();
  const [selectedItems, clearSelectedItems] = useSelectedItems();

  const [mapTokenDeleteMany] =
    useMutation<mapContextMenuRendererMapTokenRemoveManyMutation>(
      MapContextMenuRendererMapTokenRemoveManyMutation
    );
  const [mapTokenAddMany] =
    useMutation<mapContextMenuRendererMapTokenAddManyMutation>(
      MapContextMenuRendererMapTokenAddManyMutation
    );

  if (state === null) {
    return null;
  }

  const pasteNode = (
    <MenuItem
      isDisabled={copyContent.size === 0}
      onClick={() => {
        let centerX = 0;
        let centerY = 0;
        for (const item of copyContent) {
          centerX += item.x;
          centerY += item.y;
        }
        centerX /= copyContent.size;
        centerY /= copyContent.size;

        const tokens: Array<MapTokenAddManyTokenInput> = [];
        for (const token of copyContent) {
          const centerRelativeX = token.x - centerX;
          const centerRelativeY = token.y - centerY;
          tokens.push({
            x: state.imagePosition.x + centerRelativeX,
            y: state.imagePosition.y + centerRelativeY,
            rotation: token.rotation,
            color: token.color,
            label: token.label,
            radius: token.radius,
            isVisibleForPlayers: token.isVisibleForPlayers,
            isMovableByPlayers: token.isMovableByPlayers,
            isLight: token.isLight,
            lightRadius: token.lightRadius,
            isLocked: token.isLocked,
            tokenImageId: token.tokenImageId,
          });
        }
        mapTokenAddMany({
          variables: {
            input: {
              mapId: map.id,
              tokens,
            },
          },
        });
      }}
    >
      Paste Token
      {copyContent.size <= 1 ? "" : `s (${copyContent.size})`}
    </MenuItem>
  );

  return (
    <Box
      position="absolute"
      left={state.clientPosition.x}
      top={state.clientPosition.y}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <Menu defaultIsOpen={true} onClose={() => showContextMenu(null)}>
        <MenuList>
          {selectedItems.size ? (
            <>
              {pasteNode}
              <MenuItem
                onClick={() => {
                  const tokenIds = new Set(selectedItems.keys());
                  const tokens = getTokens(tokenIds);
                  setCopyContent(new Set(tokens.values()));
                }}
                isDisabled={selectedItems.size == 0}
              >
                Copy tokens ({selectedItems.size})
              </MenuItem>
              <MenuItem
                onClick={() => {
                  clearSelectedItems();
                  mapTokenDeleteMany({
                    variables: {
                      input: {
                        mapId: map.id,
                        tokenIds: Array.from(selectedItems.keys()),
                      },
                    },
                  });
                }}
                isDisabled={selectedItems.size == 0}
              >
                Delete tokens ({selectedItems.size})
              </MenuItem>
            </>
          ) : state.target?.type === "token" ? (
            <>
              <MenuItem
                onClick={() => {
                  if (state.target?.id) {
                    const tokens = getTokens(new Set([state.target.id]));
                    setCopyContent(new Set(tokens.values()));
                  }
                }}
              >
                Copy Token
              </MenuItem>

              <MenuItem
                onClick={() => {
                  if (state.target?.id) {
                    mapTokenDeleteMany({
                      variables: {
                        input: {
                          mapId: map.id,
                          tokenIds: [state.target.id],
                        },
                      },
                    });
                  }
                }}
              >
                Delete
              </MenuItem>
            </>
          ) : (
            pasteNode
          )}
        </MenuList>
      </Menu>
    </Box>
  );
};
