import React from "react";
import styled from "@emotion/styled";

const ToolbarContext = React.createContext({ horizontal: false });

const ToolbarBase = styled.div`
  pointer-events: all;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 15px;
  background-color: rgba(255, 255, 255, 1);
  text-align: center;
  width: ${p => (p.horizontal ? "max-content" : "80px")};
  height: ${p => (p.horizontal ? "80px" : "max-content")};
  display: ${p => (p.horizontal ? "flex" : null)};
  align-items: ${p => (p.horizontal ? "center" : null)};

  > :first-child {
    border-top-right-radius: 15px;
    border-top-left-radius: 15px;
  }
`;

const ToolbarGroup = styled.ul`
  display: ${p => (p.horizontal ? "flex" : "block")};
  margin: 0;
  margin-top: ${p => (p.horizontal ? "0px" : "16px")};
  margin-left: ${p => (p.horizontal ? "16px" : "12px")};
  margin-right: ${p => (p.horizontal ? "16px" : "12px")};
  padding: 0;
  padding-bottom: ${p => (!p.horizontal ? "12px" : null)};
  border-bottom: ${p =>
    p.divider && !p.vertical ? "1px solid rgba(222, 222, 222, .3)" : null};
  border-right: ${p =>
    p.horizontal && p.vertical ? "1px solid rgba(222, 222, 222, .3)" : null};
  list-style: none;
`;

const ToolbarItem = styled.li`
  position: relative;
  flex: ${p => (p.horizontal ? "1" : null)};
  min-width: ${p => (p.horizontal ? "80px" : null)};
  margin-bottom: ${p => (p.horizontal ? "0" : "8px")};
  padding-bottom: ${p => (p.horizontal ? "0" : "8px")};
  padding-top: ${p => (p.horizontal ? "0" : "8px")};
  margin-right: ${p => (p.horizontal ? "8px" : "0")};
  color: ${p =>
    p.isActive || p.isEnabled ? "rgb(34, 60, 7, 1)" : "hsl(211, 27%, 70%)"};

  &:last-child {
    margin-right: 0;
  }

  > button {
    filter: ${p =>
      p.isActive ? "drop-shadow(0 0 4px rgba(0, 0, 0, .3))" : null};

    &:hover {
      filter: ${p =>
        p.isActive || p.isEnabled
          ? "drop-shadow(0 0 4px rgba(0, 0, 0, .3))"
          : "drop-shadow(0 0 4px rgba(200, 200, 200, .6))"};
    }
  }

  svg {
    stroke: ${p =>
      p.isActive || p.isEnabled ? "rgb(34, 60, 7, 1)" : "hsl(211, 27%, 70%)"};
  }
`;

const ToolboxButton = styled.button`
  display: block;
  width: 100%;
  display: block;
  padding: 0;
  cursor: pointer;
  border: none;
  background-color: transparent;
  color: inherit;
`;

const ToolbarItemPopup = styled.div`
  position: absolute;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 15px;
  background-color: rgba(255, 255, 255, 1);
  top: 0;
  left: 80px;
  padding: 8px 12px;
  filter: none;
  min-width: 120px;
`;

export const Toolbar = ({ children, horizontal, ...props }) => {
  const contextValue = React.useMemo(() => ({ horizontal }), [horizontal]);

  return (
    <ToolbarContext.Provider value={contextValue}>
      <ToolbarBase horizontal={horizontal} {...props}>
        {children}
      </ToolbarBase>
    </ToolbarContext.Provider>
  );
};

Toolbar.Group = ({ children, style, divider, ...props }) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { horizontal } = React.useContext(ToolbarContext);

  return (
    <ToolbarGroup horizontal={horizontal} divider={divider} {...props}>
      {children}
    </ToolbarGroup>
  );
};

Toolbar.Item = ({ children, isActive, style, ...props }) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { horizontal } = React.useContext(ToolbarContext);

  return (
    <ToolbarItem horizontal={horizontal} isActive={isActive} {...props}>
      {children}
    </ToolbarItem>
  );
};

Toolbar.Button = ToolboxButton;

Toolbar.Popup = ToolbarItemPopup;
