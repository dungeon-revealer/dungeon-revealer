import * as React from "react";
import { Box, Menu, MenuItem, MenuList } from "@chakra-ui/react";
import { MapTokenEntity } from "./map-typings";
import { useContextMenu } from "./map-context-menu";
import { useSelectedItems } from "./shared-token-state";

export const ContextMenuRenderer = (props: {
  addToken: (token: Omit<Partial<MapTokenEntity>, "id">) => void;
  deleteToken: (tokenId: string) => void;
  getTokens: (tokenIds: Set<string>) => Map<string, MapTokenEntity>;
}) => {
  const { state, copyContent, showContextMenu, setCopyContent } =
    useContextMenu();
  const [selectedItems, clearSelectedItems] = useSelectedItems();

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
        for (const token of copyContent) {
          const centerRelativeX = token.x - centerX;
          const centerRelativeY = token.y - centerY;
          props.addToken({
            ...token,
            x: state.imagePosition.x + centerRelativeX,
            y: state.imagePosition.y + centerRelativeY,
          });
        }
      }}
    >
      Paste Token
      {copyContent.size <= 1 ? "" : `s ${copyContent.size}`}
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
                  for (const [tokenId] of selectedItems) {
                    // TODO: we rather want to bulk delete the tokens for less network noise :)
                    props.deleteToken(tokenId);
                  }
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
                    props.deleteToken(state.target.id);
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
