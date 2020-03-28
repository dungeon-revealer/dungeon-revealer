import React, { useMemo } from "react";
import { useSelect } from "downshift";
import styled from "@emotion/styled/macro";
import * as Icon from "./feather-icons";

const Container = styled.label`
  display: block;
  /* user-select: none; */
  position: relative;
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  line-height: 38px;
  border: 1px solid rgb(223, 223, 223);
  border-radius: 3px;
  cursor: default;
  position: relative;
  background-color: white;
  width: 100%;
  padding: 2px 6px;
`;

const HeaderTitle = styled.div``;

const ListContainer = styled.ul`
  display: block;
  list-style: none;
  position: absolute;
  bottom: 0;
  top: 100%;
  width: 100%;
  background-color: white;
  margin: 0;
  padding: 0;
  border-radius: 3px;
  border: 1px solid rgb(223, 223, 223);
  border-top: none;
  height: max-content;
  border-top-right-radius: 0;
  border-top-left-radius: 0;
`;

const ListItem = styled.li`
  padding: 6px;
  border-bottom: 1px solid rgb(223, 223, 223);
  &:last-child {
    border-bottom: none;
  }
`;

export const Dropdown = ({ value, items, onChange, isDisabled }) => {
  const _selectedItem = useMemo(() => {
    if (!items) return null;
    return items.find((item) => item.value === value) || null;
  }, [value, items]);

  const {
    isOpen,
    getLabelProps,
    selectedItem,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    highlightedIndex,
  } = useSelect({
    items,
    selectedItem: _selectedItem,
    itemToString: (item) => item.value,
    onStateChange: (state) => {
      if (isDisabled) return;
      onChange(state.selectedItem.value);
    },
  });

  return (
    <Container {...getLabelProps()}>
      <Header {...getToggleButtonProps()}>
        <HeaderTitle>{selectedItem.label}</HeaderTitle>
        <Icon.ChevronDownIcon height={20} />
      </Header>
      {isOpen ? (
        <ListContainer
          {...getMenuProps({
            onKeyDown: (ev) => {
              ev.stopPropagation();
            },
          })}
        >
          {items.map((item, index) => (
            <ListItem
              key={item.value}
              {...getItemProps({
                key: item.value,
                index,
                item,
                style: {
                  backgroundColor:
                    highlightedIndex === index ? "lightgray" : "white",
                  fontWeight: selectedItem === item ? "bold" : "normal",
                },
              })}
            >
              {item.label}
            </ListItem>
          ))}
        </ListContainer>
      ) : null}
    </Container>
  );
};
