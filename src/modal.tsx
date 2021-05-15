import React, { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
import FocusLock from "react-focus-lock";
import styled from "@emotion/styled/macro";
import { useStaticRef } from "./hooks/use-static-ref";

const modalRoot = document.getElementById("modal");
if (!modalRoot) {
  throw new TypeError("Modal Root was not found.");
}
const bodyElement = document.getElementById("body");
if (!bodyElement) {
  throw new TypeError("Body Element was not found.");
}

type ModalRegistration = {};

type CreateModalRegistrationResult = {
  destroy: () => void;
};

type CreateModalRegistrationFunction = () => CreateModalRegistrationResult;

const Context = React.createContext<CreateModalRegistrationFunction>(
  null as any
);

/**
 * Provider should be mounted once on top of the application
 * The main task of the provider is to orcastrate escape key events.
 */
const Provider: React.FC<{}> = ({ children }) => {
  const registeredModals = useStaticRef<ModalRegistration[]>(() => []);

  const createModalRegistration: CreateModalRegistrationFunction =
    useCallback(() => {
      const modalRegistration = {};

      const prevLength = registeredModals.length;

      registeredModals.unshift(modalRegistration);

      const postLength = registeredModals.length;

      if (prevLength === 0 && postLength > 0) {
        disableBodyScroll(bodyElement);
      }

      return {
        destroy: () => {
          const index = registeredModals.findIndex(
            (registration) => registration === modalRegistration
          );
          if (index === -1) {
            throw new Error("Inconsistent state.");
          }
          registeredModals.splice(index, 1);
          if (registeredModals.length === 0) {
            enableBodyScroll(bodyElement);
          }
        },
      };
    }, [registeredModals]);

  return (
    <Context.Provider value={createModalRegistration}>
      {children}
    </Context.Provider>
  );
};

export const StyledModalBackdrop = styled.div`
  background-color: rgba(0, 0, 0, 0.5);
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalBackground: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    styles?: React.CSSProperties;
  } & { focus: boolean; onPressEscape: () => void }
> = ({ children, styles, focus = true, onClick, onPressEscape, ...props }) => {
  const inner = (
    <StyledModalBackdrop
      onClick={(ev) => {
        ev.stopPropagation();
        if (onClick) onClick(ev);
      }}
      onKeyDown={(ev) => {
        ev.stopPropagation();
        if (ev.keyCode === 27) onPressEscape();
      }}
      onKeyPress={(ev) => {
        ev.stopPropagation();
      }}
      onMouseDown={(ev) => {
        ev.stopPropagation();
      }}
      onDoubleClick={(ev) => {
        ev.stopPropagation();
      }}
      onTouchStart={(ev) => {
        ev.stopPropagation();
      }}
      style={{ zIndex: 200, ...styles }}
      {...props}
    >
      {children}
    </StyledModalBackdrop>
  );

  if (focus) return <FocusLock returnFocus={true}>{inner}</FocusLock>;
  return inner;
};

const ModalPortal: React.FC<{
  onClickOutside?: () => void;
  onPressEscape: () => void;
  backgroundStyles?: any;
  focus?: boolean;
}> = ({
  children,
  onClickOutside,
  onPressEscape,
  backgroundStyles,
  focus = true,
}) => {
  const createModalRegistration = React.useContext(Context);
  const modalElement = useStaticRef(() => document.createElement("div"));

  useEffect(() => {
    modalRoot.append(modalElement);
    const modalRegistration = createModalRegistration();

    return () => {
      modalRoot.removeChild(modalElement);
      modalRegistration.destroy();
    };
    // modalElement will never change
  }, [modalElement]);

  return createPortal(
    <ModalBackground
      onClick={(ev) => {
        ev.stopPropagation();
        onClickOutside?.();
      }}
      focus={focus}
      styles={backgroundStyles}
      onPressEscape={onPressEscape}
    >
      {children}
    </ModalBackground>,
    modalElement
  );
};

// TODO: convert to const enum once all consumers use ts
export enum ModalDialogSize {
  "DEFAULT" = "DEFAULT",
  "SMALL" = "SMALL",
}

// TODO: convert to const enum once all consumers use ts
export enum DialogSizeMappings {
  "DEFAULT" = 1024,
  "SMALL" = 512,
}

const Dialog: React.FC<
  React.FormHTMLAttributes<HTMLFormElement> & {
    size?: ModalDialogSize.SMALL;
  }
> = ({
  children,
  size = ModalDialogSize.DEFAULT,
  onSubmit: onSubmitOuter,
  ...props
}) => {
  const onSubmit: (event: React.FormEvent<HTMLFormElement>) => void =
    useCallback(
      (ev) => {
        ev.preventDefault();
        if (onSubmitOuter) {
          onSubmitOuter(ev);
        }
      },
      [onSubmitOuter]
    );
  return (
    <form
      onSubmit={onSubmit}
      role="dialog"
      style={{
        width: "100%",
        //@ts-ignore
        maxWidth: DialogSizeMappings[size],
        backgroundColor: "white",
        borderRadius: 5,
        marginLeft: 8,
        marginRight: 8,
      }}
      onClick={(ev) => {
        ev.stopPropagation();
      }}
      {...props}
    >
      {children}
    </form>
  );
};

const Header = styled.div`
  padding: 8px 20px;
  width: 100%;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
`;

const Heading2 = styled.h2`
  margin: 0;
  font-size: 2rem;

  > svg:first-child {
    display: inline-block;
    transform: translateY(-3px);
    margin-right: 12px;
  }
`;

const Heading3 = styled.h3`
  margin: 0;
`;

const Body = styled.div<{ noPadding?: boolean }>`
  width: 100%;
  padding: ${(p) => (p.noPadding ? null : `20px 20px 20px 20px`)};
`;

const Aside = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 30%;
  width: 100%;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
`;

const Footer = styled.div`
  padding-left: 20px;
  padding-right: 20px;
  padding-top: 20px;
  padding-bottom: 16px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-width: 0;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
`;

const ActionGroup = styled.div<{ left?: boolean }>`
  margin-left: ${(p) => (p.left ? "0" : "20px")};
  margin-right: ${(p) => (p.left ? "auto" : null)};

  > * {
    margin-left: 18px;
  }

  > *:first-of-type {
    margin-left: 0;
  }

  display: flex;
`;

export const Modal = Object.assign(ModalPortal, {
  Dialog,
  Header,
  Heading2,
  Heading3,
  Body,
  Aside,
  Footer,
  Content,
  Actions,
  ActionGroup,
  Provider,
});
