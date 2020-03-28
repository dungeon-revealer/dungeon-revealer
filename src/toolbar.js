import React, { useMemo, useEffect, useRef } from "react";
import styled from "@emotion/styled/macro";

const ToolbarContext = React.createContext({ horizontal: false });

const ToolbarBase = styled.div`
  pointer-events: all;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 15px;
  background-color: rgba(255, 255, 255, 1);
  text-align: center;
  width: ${(p) => (p.horizontal ? "max-content" : "80px")};
  height: ${(p) => (p.horizontal ? "80px" : "max-content")};
  display: ${(p) => (p.horizontal ? "flex" : null)};
  align-items: ${(p) => (p.horizontal ? "center" : null)};

  > :first-of-type {
    border-top-right-radius: ${(p) => (p.horizontal ? null : `15px`)};
    border-top-left-radius: 15px;
    border-bottom-left-radius: ${(p) => (p.horizontal ? `15px` : null)};
  }
`;

const ToolbarGroup = styled.ul`
  display: ${(p) => (p.horizontal ? "flex" : "block")};
  margin: 0;
  margin-top: ${(p) => (p.horizontal ? "0px" : "16px")};
  margin-left: ${(p) => (p.horizontal ? "16px" : "12px")};
  margin-right: ${(p) => (p.horizontal ? "16px" : "12px")};
  padding: 0;
  padding-bottom: ${(p) => (!p.horizontal ? "12px" : null)};
  border-bottom: ${(p) =>
    p.divider && !p.vertical ? "1px solid rgba(222, 222, 222, .3)" : null};
  border-right: ${(p) =>
    p.horizontal && p.vertical ? "1px solid rgba(222, 222, 222, .3)" : null};
  list-style: none;
`;

const ToolbarItem = styled.li`
  position: relative;
  flex: ${(p) => (p.horizontal ? "1" : null)};
  min-width: ${(p) => (p.horizontal ? "80px" : null)};
  margin-bottom: ${(p) => (p.horizontal ? "0" : "8px")};
  padding-bottom: ${(p) => (p.horizontal ? "0" : "8px")};
  padding-top: ${(p) => (p.horizontal ? "0" : "8px")};
  margin-right: ${(p) => (p.horizontal ? "8px" : "0")};
  color: ${(p) =>
    p.isActive || p.isEnabled ? "rgb(34, 60, 7, 1)" : "hsl(211, 27%, 70%)"};

  &:last-child {
    margin-right: 0;
  }

  > button {
    filter: ${(p) =>
      p.isActive ? "drop-shadow(0 0 4px rgba(0, 0, 0, .3))" : null};

    &:hover {
      filter: ${(p) =>
        p.isActive || p.isEnabled
          ? "drop-shadow(0 0 4px rgba(0, 0, 0, .3))"
          : "drop-shadow(0 0 4px rgba(200, 200, 200, .6))"};
    }
  }

  svg {
    stroke: ${(p) =>
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

const ToolbarItemPopupContainer = styled.div`
  position: absolute;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 15px;
  background-color: rgba(255, 255, 255, 1);
  top: ${(p) => (p.horizontal ? null : `0`)};
  bottom: ${(p) => (p.horizontal ? `80px` : null)};
  left: ${(p) => (p.horizontal ? `-16px` : `80px`)};
  padding: 8px 12px;
  filter: none;
  min-width: 120px;
  width: max-content;
`;

const ToolbarItemPopup = React.forwardRef(({ children }, ref) => {
  const { horizontal } = React.useContext(ToolbarContext);
  return (
    <ToolbarItemPopupContainer horizontal={horizontal} ref={ref}>
      {children}
    </ToolbarItemPopupContainer>
  );
});

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

const ToolbarLogo = styled.div`
  background-color: #044e54;
  padding-top: ${(p) => (p.horizontal ? `10px` : `25px`)};
  padding-bottom: ${(p) => (p.horizontal ? null : `15px`)};
  padding-left: ${(p) => (p.horizontal ? `15px` : null)};
  padding-right: ${(p) => (p.horizontal ? `20px` : null)};
  height: ${(p) => (p.horizontal ? `100%` : null)};
  font-size: 20px;
  font-weight: bold;
  color: rgba(255, 255, 255, 1);
  margin-bottom: ${(p) => (p.horizontal ? null : `24px`)};
  font-family: folkard, palitino, serif;
  display: ${(p) => (p.horizontal ? `flex` : null)};
  align-items: ${(p) => (p.horizontal ? `center` : null)};
  line-height: 2;
`;

const Logo = () => {
  const { horizontal } = React.useContext(ToolbarContext);
  return <ToolbarLogo horizontal={horizontal}>DR</ToolbarLogo>;
};

const Group = ({ children, style, divider, ...props }) => {
  const { horizontal } = React.useContext(ToolbarContext);
  return (
    <ToolbarGroup horizontal={horizontal} divider={divider} {...props}>
      {children}
    </ToolbarGroup>
  );
};

const Item = ({ children, isActive, style, ...props }) => {
  const { horizontal } = React.useContext(ToolbarContext);

  return (
    <ToolbarItem horizontal={horizontal} isActive={isActive} {...props}>
      {children}
    </ToolbarItem>
  );
};

const LongPressButton = ({ onLongPress, ...props }) => {
  const timeoutRef = useRef(null);
  const releaseHandler = useRef(null);

  const onMouseDown = useMemo(() => {
    if (!onLongPress) {
      return undefined;
    }
    return (ev) => {
      ev.stopPropagation();
      timeoutRef.current = setTimeout(() => {
        releaseHandler.current = onLongPress();
      }, 300);
    };
  }, [onLongPress]);

  const onMouseUp = useMemo(() => {
    if (!onLongPress) {
      return undefined;
    }
    return () => {
      if (releaseHandler.current) {
        releaseHandler.current();
      }
      clearTimeout(timeoutRef.current);
    };
  }, [onLongPress]);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <ToolboxButton
      {...props}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onMouseUp}
    />
  );
};

Toolbar.Logo = Logo;
Toolbar.Group = Group;
Toolbar.Item = Item;
Toolbar.Button = ToolboxButton;
Toolbar.LongPressButton = LongPressButton;
Toolbar.Popup = ToolbarItemPopup;
