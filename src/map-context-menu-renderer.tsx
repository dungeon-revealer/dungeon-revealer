import * as React from "react";
import { Box, Menu, MenuItem, MenuList } from "@chakra-ui/react";
import { MapTokenEntity } from "./map-typings";
import { useContextMenu } from "./map-context-menu";
import { useSelectedItems } from "./shared-token-state";

export const ContextMenuRenderer = (props: {
  addToken: (token: Omit<Partial<MapTokenEntity>, "id">) => void;
  deleteToken: (tokenId: string) => void;
  getToken: (tokenId: string) => null | MapTokenEntity;
}) => {
  const { state, copyContent, showContextMenu, setCopyContent } =
    useContextMenu();
  const [selectedItems, clearSelectedItems] = useSelectedItems();

  if (state === null) {
    return null;
  }

  return (
    <Box
      position="absolute"
      left={state.clientPosition.x}
      top={state.clientPosition.y}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <Menu defaultIsOpen={true} onClose={() => showContextMenu(null)}>
        <MenuList>
          {state.target?.type === "token" ? (
            <>
              <MenuItem
                onClick={() => {
                  if (state.target?.id) {
                    const token = props.getToken(state.target.id);
                    setCopyContent(token);
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
            <>
              <MenuItem
                isDisabled={copyContent === null}
                onClick={() => {
                  if (copyContent) {
                    props.addToken({
                      ...copyContent,
                      x: state.imagePosition.x,
                      y: state.imagePosition.y,
                    });
                  }
                }}
              >
                Paste Token
              </MenuItem>
            </>
          )}
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
            Delete selected tokens ({selectedItems.size})
          </MenuItem>
        </MenuList>
      </Menu>
    </Box>
  );
};
