import React from "react";
import { Modal } from "./modal";
import styled from "@emotion/styled/macro";

const LightBoxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  overflow: scroll;
`;

const ButtonBackground = styled.button`
  all: unset;
  display: block;
`;

export const ImageLightBoxModal: React.FC<{
  src: string;
  close: () => void;
}> = ({ src, close }) => {
  return (
    <Modal onClickOutside={close} onPressEscape={close}>
      <ButtonBackground onClick={(ev) => ev.stopPropagation()}>
        <LightBoxImage src={src} />
      </ButtonBackground>
    </Modal>
  );
};
