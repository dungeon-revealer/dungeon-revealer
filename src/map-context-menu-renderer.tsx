import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { useMutation } from "relay-hooks";
import { Box, Menu, MenuItem, MenuList } from "@chakra-ui/react";
import { MapTokenEntity } from "./map-typings";
import { useContextMenu } from "./map-context-menu";
import { useSelectedItems } from "./shared-token-state";
import { mapContextMenuRendererMapTokenRemoveManyMutation } from "./__generated__/mapContextMenuRendererMapTokenRemoveManyMutation.graphql";
import {
  mapContextMenuRendererMapTokenAddManyMutation,
  MapTokenAddManyTokenInput,
} from "./__generated__/mapContextMenuRendererMapTokenAddManyMutation.graphql";

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

export const ContextMenuRenderer = (props: {
  currentMapId: string;
  getTokens: (tokenIds: Set<string>) => Map<string, MapTokenEntity>;
}) => {
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
            isLocked: token.isLocked,
            tokenImageId: token.tokenImageId,
          });
        }
        mapTokenAddMany({
          variables: {
            input: {
              mapId: props.currentMapId,
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
                  const tokens = props.getTokens(tokenIds);
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
                        mapId: props.currentMapId,
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
                    const tokens = props.getTokens(new Set([state.target.id]));
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
                          mapId: props.currentMapId,
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
