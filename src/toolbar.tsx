import React, { useMemo, useEffect } from "react";
import styled from "@emotion/styled/macro";
import type { ReactEventHandlers } from "react-use-gesture/dist/types";

const MARGIN_2 = "4px";
const BORDER_RADIUS = "5px";

const ToolbarContext = React.createContext({ horizontal: false });

const ToolbarBase = styled.div<{ horizontal?: boolean }>`
  pointer-events: all;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 15px;
  text-align: center;
  width: ${(p) => (p.horizontal ? "max-content" : "50px")};
  height: ${(p) => (p.horizontal ? "50px" : "max-content")};
  display: ${(p) => (p.horizontal ? "flex" : null)};
  align-items: ${(p) => (p.horizontal ? "center" : null)};

  > :last-child {
    border-top-right-radius: ${(p) => (p.horizontal ? BORDER_RADIUS : null)};
    border-top-left-radius: 0;
    border-bottom-right-radius: ${BORDER_RADIUS};
    border-bottom-left-radius: ${(p) => (p.horizontal ? null : BORDER_RADIUS)};
  }

  > :first-child {
    border-top-right-radius: ${(p) => (p.horizontal ? null : BORDER_RADIUS)};
    border-top-left-radius: ${BORDER_RADIUS};
    border-bottom-left-radius: ${(p) => (p.horizontal ? BORDER_RADIUS : null)};
  }
`;

const ToolbarGroup = styled.ul<{
  horizontal?: boolean;
  vertical?: boolean;
  divider?: boolean;
}>`
  display: ${(p) => (p.horizontal ? "flex" : "block")};
  margin: 0;
  padding: 0;
  padding-bottom: ${(p) => (!p.horizontal ? MARGIN_2 : null)};
  border-bottom: ${(p) =>
    p.divider && !p.vertical ? "1px solid rgba(222, 222, 222, .3)" : null};
  border-right: ${(p) =>
    p.horizontal && p.vertical ? "1px solid rgba(222, 222, 222, .3)" : null};
  list-style: none;
  background-color: rgba(255, 255, 255, 1);

  &:first-of-type {
    padding-left: ${(p) => (p.horizontal ? "12px" : null)};
  }
`;

const ToolbarItem = styled.li<{
  horizontal?: boolean;
  isEnabled?: boolean;
  isActive?: boolean;
}>`
  position: relative;
  flex: ${(p) => (p.horizontal ? "1" : null)};
  min-width: ${(p) => (p.horizontal ? "70px" : null)};
  padding-top: ${(p) => (p.horizontal ? "0" : "16px")};
  padding-right: ${(p) => (p.horizontal ? "8px" : "0")};
  height: ${(p) => (p.horizontal ? "50px" : "auto")};

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  > :nth-child(2) {
    margin-top: 4px;
  }

  color: ${(p) =>
    p.isActive || p.isEnabled ? "rgb(34, 60, 7, 1)" : "hsl(211, 27%, 70%)"};

  &:last-child {
    margin-right: 0;
  }

  > button {
    height: ${(p) => (p.horizontal ? "50px" : "auto")};
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
  padding: 0;
  cursor: pointer;
  border: none;
  background-color: transparent;
  color: inherit;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  > :nth-child(2) {
    margin-top: 4px;
  }
`;

const ToolbarItemPopupContainer = styled.div<{ horizontal?: boolean }>`
  position: absolute;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: ${BORDER_RADIUS};
  background-color: rgba(255, 255, 255, 1);
  top: ${(p) => (p.horizontal ? null : `0`)};
  bottom: ${(p) => (p.horizontal ? `55px` : null)};
  left: ${(p) => (p.horizontal ? `-12px` : `55px`)};
  filter: none;
  min-width: 180px;
`;

const ToolbarItemPopup = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode }
>(({ children }, ref) => {
  const { horizontal } = React.useContext(ToolbarContext);
  return (
    <ToolbarItemPopupContainer horizontal={horizontal} ref={ref}>
      {children}
    </ToolbarItemPopupContainer>
  );
});

type ToolbarType = React.FC<{ horizontal?: boolean }> & {
  Logo: typeof Logo;
  Group: typeof Group;
  Item: typeof Item;
  Button: typeof ToolboxButton;
  LongPressButton: typeof LongPressButton;
  Popup: typeof ToolbarItemPopup;
};

export const Toolbar: ToolbarType = ({ children, horizontal, ...props }) => {
  const contextValue = React.useMemo(
    () => ({ horizontal: horizontal ?? false }),
    [horizontal]
  );

  return (
    <ToolbarContext.Provider value={contextValue}>
      <ToolbarBase horizontal={horizontal} {...props}>
        {children}
      </ToolbarBase>
    </ToolbarContext.Provider>
  );
};

const ToolbarLogo = styled.div<{
  horizontal?: boolean;
  cursor?: string;
}>`
  width: 50px;
  height: 50px;
  background-color: #044e54;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  font-weight: bold;
  color: rgba(255, 255, 255, 1);
  font-family: folkard, palitino, serif;
  line-height: 2;
  cursor: ${(props) => props.cursor};

  > span {
    transform: translateY(22%);
  }

  &:last-child {
    border-top-right-radius: ${(p) => (p.horizontal ? BORDER_RADIUS : null)};
    border-bottom-right-radius: ${(p) => (p.horizontal ? BORDER_RADIUS : null)};
    border-top-left-radius: ${(p) => (p.horizontal ? BORDER_RADIUS : null)};
    border-bottom-left-radius: ${(p) => (p.horizontal ? BORDER_RADIUS : null)};
  }
`;

const Logo: React.FC<{
  cursor?: string & ReactEventHandlers;
}> = (props) => {
  const { horizontal } = React.useContext(ToolbarContext);
  return (
    <ToolbarLogo horizontal={horizontal} {...props}>
      <span>DR</span>
    </ToolbarLogo>
  );
};

const Group: React.FC<
  Pick<React.ComponentProps<"div">, "style"> & { divider?: boolean }
> = ({ children, style, divider, ...props }) => {
  const { horizontal } = React.useContext(ToolbarContext);
  return (
    <ToolbarGroup horizontal={horizontal} divider={divider} {...props}>
      {children}
    </ToolbarGroup>
  );
};

const Item = React.forwardRef<
  HTMLLIElement,
  Exclude<React.ComponentProps<"li">, "style"> & { isActive?: boolean }
>(({ children, isActive, style, ...props }, ref) => {
  const { horizontal } = React.useContext(ToolbarContext);

  return (
    <ToolbarItem
      {...props}
      horizontal={horizontal}
      isActive={isActive}
      ref={ref}
    >
      {children}
    </ToolbarItem>
  );
});

const LongPressButton: React.FC<{
  onLongPress?: () => () => void;
  onClick: () => void;
}> = ({ onLongPress, ...props }) => {
  const timeoutRef = React.useRef<() => void>();

  const onMouseDown = useMemo(() => {
    if (!onLongPress) {
      return undefined;
    }

    return (ev: React.MouseEvent | React.TouchEvent) => {
      ev.stopPropagation();
      const timeout = setTimeout(() => {
        const releaseHandler = onLongPress();

        const onMouseUp = () => {
          if (releaseHandler) {
            releaseHandler();
          }
          timeoutRef.current?.();
          window.removeEventListener("mouseup", onMouseUp);
          window.removeEventListener("touchend", onMouseUp);
          window.removeEventListener("touchcancel", onMouseUp);
        };

        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchend", onMouseUp);
        window.addEventListener("touchcancel", onMouseUp);
      }, 300);
      timeoutRef.current = () => clearTimeout(timeout);

      const onMouseUp = () => {
        timeoutRef.current?.();
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("touchend", onMouseUp);
        window.removeEventListener("touchcancel", onMouseUp);
      };

      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchend", onMouseUp);
      window.addEventListener("touchcancel", onMouseUp);
    };
  }, [onLongPress]);

  useEffect(() => () => timeoutRef.current?.(), []);

  return (
    <ToolboxButton
      {...props}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
    />
  );
};

Toolbar.Logo = Logo;
Toolbar.Group = Group;
Toolbar.Item = Item;
Toolbar.Button = ToolboxButton;
Toolbar.LongPressButton = LongPressButton;
Toolbar.Popup = ToolbarItemPopup;
