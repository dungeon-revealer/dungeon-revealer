import React from "react";
import { Modal } from "./modal";
import styled from "@emotion/styled/macro";

const LightBoxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  overflow: scroll;
`;

export const ImageLightBoxModal: React.FC<{
  src: string;
  close: () => void;
}> = ({ src, close }) => {
  return (
    <Modal onClickOutside={close} onPressEscape={close} focus={false}>
      <LightBoxImage src={src} />
    </Modal>
  );
};
