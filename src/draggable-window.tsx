import * as React from "react";
import styled from "@emotion/styled/macro";
import { animated, useSpring } from "react-spring";
import { useDrag, useGesture } from "react-use-gesture";
import { Tooltip } from "@chakra-ui/react";
import * as Icon from "./feather-icons";
import * as Button from "./button";

const WindowContainer = styled(animated.div)<{ isSideBarVisible: boolean }>`
  position: absolute;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: white;
  position: absolute;
  z-index: 100;
  user-select: text;
  border-top-left-radius: ${(props) => (props.isSideBarVisible ? 0 : null)};
  border-bottom-left-radius: ${(props) => (props.isSideBarVisible ? 0 : null)};
`;

const WindowHeader = styled.div`
  height: 50px;
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
  overflow: hidden;
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

const WindowSideBar = styled.div`
  position: absolute;
  top: 0;
  transform: translateX(-249px);
  max-width: 250px;
  width: 100%;
  background: white;
  height: 100%;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
`;

const hasButtonParent = (el: any) => {
  let isButton = false;
  while (isButton === false && el) {
    isButton = el instanceof HTMLButtonElement;
    el = el?.parentNode ?? null;
  }

  return isButton;
};

export type SetWidthHandler = (f: (width: number) => number) => void;

export const DraggableWindow = ({
  headerContent,
  bodyContent,
  onKeyDown,
  onMouseDown,
  close,
  headerLeftContent = null,
  options = [],
  onDidResize,
  sideBarContent,
  setWidthRef,
}: {
  headerContent: React.ReactNode;
  bodyContent: React.ReactNode;
  onKeyDown: React.ComponentProps<"div">["onKeyDown"];
  onMouseDown?: React.ComponentProps<"div">["onMouseDown"];
  close: () => void;
  headerLeftContent?: React.ReactNode;
  options?: {
    title: string;
    onClick: (ev: React.MouseEvent) => void;
    icon: React.ReactElement;
    isDisabled?: boolean;
  }[];
  onDidResize?: () => void;
  sideBarContent?: React.ReactElement | null | undefined;
  setWidthRef?: React.MutableRefObject<SetWidthHandler | null>;
}): JSX.Element => {
  const [props, set] = useSpring(() => ({
    x: window.innerWidth / 2 - 500 / 2,
    y: window.innerHeight / 4,
    width: 500,
    height: window.innerHeight / 2,
  }));

  React.useEffect(() => {
    if (setWidthRef) {
      setWidthRef.current = (f) => {
        props.width.set(f(props.width.get()));
      };
    }
  });

  // In case the component un-mounts before the drag finished we need to remove the use-select-disabled class from body
  const onUnmountRef = React.useRef<() => void>();
  React.useEffect(() => () => onUnmountRef.current?.(), []);

  const windowHeaderRef = React.useRef<HTMLDivElement | null>(null);

  const bind = useGesture({
    onDrag: ({
      movement: [mx, my],
      memo = [props.x.get(), props.y.get()],
      event,
      cancel,
    }) => {
      // cancel dragging on buttons and inputs
      if (
        event.target instanceof HTMLInputElement ||
        hasButtonParent(event.target)
      ) {
        return cancel();
      }

      set({
        x: memo[0] + mx,
        y: memo[1] + my,
        immediate: true,
      });

      return memo;
    },
    onMouseDown: ({ event }) => {
      const headerElement = windowHeaderRef.current;
      // on desktop we want to disable user-select while dragging
      if (
        headerElement &&
        event.target instanceof Node &&
        (event.target === headerElement || headerElement.contains(event.target))
      ) {
        window.document.body.classList.add("user-select-disabled");
        const onUnmount = () => {
          window.document.body.classList.remove("user-select-disabled");
          window.removeEventListener("mouseup", onUnmount);
        };
        window.addEventListener("mouseup", onUnmount);
        onUnmountRef.current = onUnmount;
      }
    },
  });

  const dimensionDragBind = useDrag(
    ({ movement: [mx, my], down }) => {
      set({
        width: Math.max(mx, 300),
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
      isSideBarVisible={sideBarContent != null}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onContextMenu={(ev) => {
        ev.stopPropagation();
      }}
      style={{
        top: 0,
        left: 0,
        x: props.x,
        y: props.y,
        width: props.width,
      }}
    >
      <WindowHeader {...bind()} ref={windowHeaderRef}>
        {headerLeftContent ? (
          <div style={{ flexShrink: 0 }}>{headerLeftContent}</div>
        ) : null}
        <div
          style={{
            fontWeight: "bold",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginLeft: 4,
            marginRight: 4,
            width: "100%",
          }}
        >
          {headerContent}
        </div>
        {options.map((option) => (
          <div style={{ marginRight: 4 }} key={option.title}>
            <Tooltip label={option.title}>
              <Button.Tertiary
                small
                iconOnly
                onClick={option.onClick}
                disabled={option.isDisabled}
              >
                {option.icon}
              </Button.Tertiary>
            </Tooltip>
          </div>
        ))}
        <div style={{ marginRight: 0 }}>
          <Button.Tertiary small iconOnly onClick={close} title="Close">
            <Icon.X boxSize="16px" />
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
      {sideBarContent ? <WindowSideBar>{sideBarContent}</WindowSideBar> : null}
    </WindowContainer>
  );
};
