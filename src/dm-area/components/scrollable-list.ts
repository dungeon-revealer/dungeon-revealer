import styled from "@emotion/styled/macro";

export const List = styled.ul`
  padding: 0;
  list-style: none;
  flex: 1;
  overflow-y: scroll;
  margin-bottom: 0;
`;

export const ListItem = styled.li``;

export const ListItemButton = styled.button<{ isActive?: boolean }>`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-weight: bold;
  display: block;
  width: 100%;
  border: none;
  text-align: left;
  padding: 20px;
  cursor: pointer;
  text-decoration: none;
  padding-left: 13px;
  padding-right: 20px;
  background-color: ${(p) =>
    p.isActive ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 1)"};
  color: ${(p) => (p.isActive ? "#044e54" : "rgba(148, 160, 175, 1)")};

  &:focus,
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
    color: #044e54;
  }

  border-left: ${(p) =>
    p.isActive ? "7px solid #BCCCDC" : "7px solid transparent"};

  outline: none;
`;
