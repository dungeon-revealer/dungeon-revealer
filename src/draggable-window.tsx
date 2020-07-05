import * as React from "react";
import styled from "@emotion/styled/macro";
import { animated, useSpring } from "react-spring";
import { useDrag } from "react-use-gesture";
import * as Icon from "./feather-icons";
import * as Button from "./button";

const WindowContainer = styled(animated.div)`
  position: absolute;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: white;
  position: absolute;
  z-index: 100;
  user-select: text;
`;

const WindowHeader = styled.div`
  display: flex;
  padding: 8px 12px;
  border-bottom: 1px solid lightgray;
  cursor: grab;
  align-items: center;
  justify-content: flex-end;
`;

const WindowBody = styled(animated.div)`
  height: 400px;
  width: 100%;
  overflow-y: scroll;
`;

const WindowsResizeHandle = styled.button`
  all: unset;
  position: absolute;
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  height: 15px;
  width: 15px;
`;

window.addEventListener("mousedown", (ev) => {
  if (ev.target && ev.target instanceof HTMLElement) {
    ev.target.hasAttribute("data-draggable");
    window.document.body.style.userSelect = "none";
    window.addEventListener(
      "mouseup",
      () => {
        window.document.body.style.userSelect = "";
      },
      { once: true }
    );
  }
});

export const DraggableWindow = ({
  headerContent,
  bodyContent,
  onKeyDown,
  onMouseDown,
  close,
  style,
  headerLeftContent = null,
  options = [],
  onDidResize,
}: {
  headerContent: React.ReactNode;
  bodyContent: React.ReactNode;
  onKeyDown: React.ComponentProps<"div">["onKeyDown"];
  onMouseDown: React.ComponentProps<"div">["onMouseDown"];
  close: () => void;
  style?: Pick<React.CSSProperties, "top" | "left" | "right">;
  headerLeftContent?: React.ReactNode;
  options?: {
    title: string;
    onClick: () => void;
    Icon: (p: { height?: number }) => React.ReactElement;
  }[];
  onDidResize?: () => void;
}): JSX.Element => {
  const [props, set] = useSpring(() => ({
    x: 0,
    y: 0,
    width: 500,
    height: window.innerHeight / 2,
  }));

  const bind = useDrag(
    ({ movement: [mx, my] }) => {
      set({
        x: mx,
        y: my,
        immediate: true,
      });
    },
    {
      initial: () => [props.x.get(), props.y.get()],
    }
  );

  const dimensionDragBind = useDrag(
    ({ movement: [mx, my], down }) => {
      set({
        width: mx,
        height: my,
        immediate: true,
      });
      if (down === false) {
        onDidResize?.();
      }
    },
    {
      initial: () => [props.width.get(), props.height.get()],
    }
  );

  return (
    <WindowContainer
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onContextMenu={(ev) => {
        ev.stopPropagation();
      }}
      style={{
        ...style,
        x: props.x,
        y: props.y,
        width: props.width,
      }}
    >
      <WindowHeader {...bind()} data-draggable>
        {headerLeftContent ? <div>{headerLeftContent}</div> : null}
        <div
          style={{
            fontWeight: "bold",
            marginRight: "auto",
            whiteSpace: "nowrap",
            overflowY: "hidden",
            textOverflow: "ellipsis",
            paddingLeft: 4,
          }}
        >
          {headerContent}
        </div>
        {options.map(({ title, onClick, Icon }) => (
          <div style={{ marginRight: 4 }} key={title}>
            <Button.Tertiary small iconOnly onClick={onClick} title={title}>
              <Icon height={16} />
            </Button.Tertiary>
          </div>
        ))}
        <div style={{ marginRight: 0 }}>
          <Button.Tertiary small iconOnly onClick={close} title="Close">
            <Icon.XIcon height={16} />
          </Button.Tertiary>
        </div>
      </WindowHeader>
      <WindowBody
        style={{
          height: props.height,
        }}
      >
        {bodyContent}
      </WindowBody>
      <WindowsResizeHandle {...dimensionDragBind()} />
    </WindowContainer>
  );
};
