import React, { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
import FocusTrap from "focus-trap-react";
import styled from "@emotion/styled/macro";
import { useStaticRef } from "../util";

const modalRoot = document.getElementById("modal");
if (!modalRoot) {
  throw new TypeError("Modal Root was not found.");
}
const bodyElement = document.getElementById("body");
if (!bodyElement) {
  throw new TypeError("Body Element was not found.");
}

const Context = React.createContext(() => {});

/**
 * Provider should be mounted once on top of the application
 * The main task of the provider is to orcastrate escape key events.
 */
const Provider = ({ children }) => {
  const registeredModals = useStaticRef(() => []);

  const createModalRegistration = useCallback(
    escapeHandler => {
      const modalRegistration = {
        escapeHandler
      };

      const prevLength = registeredModals.length;

      registeredModals.unshift(modalRegistration);

      const postLength = registeredModals.length;

      if (prevLength === 0 && postLength > 0) {
        disableBodyScroll(bodyElement);
      }

      return {
        setEscapeHandler: handler => {
          modalRegistration.escapeHandler = handler;
        },
        destroy: () => {
          const index = registeredModals.findIndex(
            registration => registration === modalRegistration
          );
          if (!index === -1) {
            throw new Error("Inconsistent state.");
          }
          registeredModals.splice(index, 1);
          if (registeredModals.length === 0) {
            enableBodyScroll(bodyElement);
          }
        }
      };
    },
    [registeredModals]
  );

  // register escape event listener
  useEffect(() => {
    const keydownListener = ev => {
      if (ev.keyCode === 27) {
        for (const registeredModal of registeredModals) {
          // only handle the first escapeHandler that occures.
          if (registeredModal.escapeHandler) {
            registeredModal.escapeHandler(ev);
            break;
          }
        }
      }
    };

    window.addEventListener("keyup", keydownListener, false);

    return () => {
      window.removeEventListener("keyup", keydownListener);
    };
  }, [registeredModals]);

  return (
    <Context.Provider value={createModalRegistration}>
      {children}
    </Context.Provider>
  );
};

const ModalBackground = ({ children, ...props }) => (
  <FocusTrap>
    <div
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        position: "fixed",
        height: "100%",
        width: "100%",
        top: 0,
        left: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200
      }}
      {...props}
    >
      {children}
    </div>
  </FocusTrap>
);

const ModalPortal = ({ children, onClickOutside, onPressEscape }) => {
  const createModalRegistration = React.useContext(Context);
  const modalElement = useStaticRef(() => document.createElement("div"));
  const modalRegistration = React.useRef(null);

  useEffect(() => {
    modalRoot.append(modalElement);
    const modalRegistration = createModalRegistration(onPressEscape);
    modalRegistration.current = modalRegistration;

    return () => {
      modalRoot.removeChild(modalElement);
      modalRegistration.destroy();
    };
    // modalElement will never change
    // onPressEscape is omitted because the registration should only be done once.
    // further changes should be handled by the useEffect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalElement]);

  useEffect(() => {
    if (!modalRegistration.current) {
      return;
    }
    modalRegistration.current.setEscapeHandler(onPressEscape);
  }, [onPressEscape]);

  return createPortal(
    <ModalBackground onClick={onClickOutside}>{children}</ModalBackground>,
    modalElement
  );
};

export const ModalDialogSize = {
  DEFAULT: "DEFAULT",
  SMALL: "SMALL"
};

const DialogSizeMappings = {
  DEFAULT: 1024,
  SMALL: 512
};

const Dialog = ({ children, size = ModalDialogSize.DEFAULT }) => {
  return (
    <div
      role="dialog"
      style={{
        width: "100%",
        maxWidth: DialogSizeMappings[size],
        backgroundColor: "white",
        borderRadius: 5,
        marginLeft: 8,
        marginRight: 8
      }}
      onClick={ev => {
        ev.stopPropagation();
      }}
    >
      {children}
    </div>
  );
};

const Header = ({ children, style, ...props }) => {
  return (
    <div
      {...props}
      style={{
        width: "100%",
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 16,
        paddingBottom: 8,
        borderBottom: "1px solid rgba(0,0,0,.1)",
        ...style
      }}
    >
      {children}
    </div>
  );
};

const Body = ({ children, noPadding, style, ...props }) => {
  return (
    <div
      {...props}
      style={{
        width: "100%",
        ...(noPadding
          ? {}
          : { paddingLeft: 20, paddingRight: 20, paddingTop: 20 }),

        ...style
      }}
    >
      {children}
    </div>
  );
};

const Actions = styled.div`
  padding-left: 20px;
  padding-right: 20px;
  padding-top: 20px;
  display: flex;
  justify-content: flex-end;
  padding-bottom: 16px;
`;

const ActionGroup = styled.div`
  margin-left: 20px;
  > button {
    margin-left: 18px;
  }
`;

export const Modal = Object.assign(ModalPortal, {
  Dialog,
  Header,
  Body,
  Actions,
  ActionGroup,
  Provider
});
