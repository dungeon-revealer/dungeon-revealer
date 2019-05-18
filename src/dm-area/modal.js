import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

const modalRoot = document.getElementById("modal");
if (!modalRoot) {
  throw new TypeError("Modal Root was not found.");
}

const ModalBackground = ({ children, ...props }) => (
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
);

const ModalPortal = ({ children, onClickOutside, onPressEscape }) => {
  const [modalElement] = useState(() => document.createElement("div"));
  useEffect(() => {
    modalRoot.append(modalElement);
    const body = document.querySelector("body");
    disableBodyScroll(body);

    const keydownListener = ev => {
      if (ev.keyCode === 27 && onPressEscape) {
        onPressEscape();
      }
    };

    window.addEventListener("keydown", keydownListener);

    return () => {
      window.removeEventListener("keydown", keydownListener);
      modalRoot.removeChild(modalElement);
      enableBodyScroll(body);
    };
  }, [modalElement, onPressEscape]);

  return createPortal(
    <ModalBackground onClick={onClickOutside}>{children}</ModalBackground>,
    modalElement
  );
};

const Dialog = ({ children }) => {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1024,
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

const Body = ({ children, style, ...props }) => {
  return (
    <div
      {...props}
      style={{
        width: "100%",
        ...style
      }}
    >
      {children}
    </div>
  );
};

export const Modal = Object.assign(ModalPortal, {
  Dialog,
  Header,
  Body
});
