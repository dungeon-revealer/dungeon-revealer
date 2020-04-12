import React from "react";
import styled from "@emotion/styled/macro";
import { Modal } from "../../modal";
import { buildUrl } from "../../public-url";
import * as Icon from "../../feather-icons";
import * as Button from "../../button";

const Container = styled.span`
  display: block;
  position: relative;
`;

const Image = styled.img`
  max-width: 100%;
`;

const Menu = styled.span`
  display: block;
  position: absolute;
  top: 0;
  right: 0;
  margin-top: 4px;
  margin-right: 4px;
  > * {
    margin-left: 8px;
  }
`;

const LightBoxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  overflow: scroll;
`;

const LightBoxModal: React.FC<{ src: string; close: () => void }> = ({
  src,
  close,
}) => {
  return (
    <Modal onClickOutside={close} onPressEscape={close} focus={false}>
      <LightBoxImage src={src} />
    </Modal>
  );
};

export const SharableImage: React.FC<{ src: string }> = ({ src }) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showLightboxImage, setShowLightBoxImage] = React.useState(false);

  return (
    <Container
      onMouseEnter={() => {
        setShowMenu(true);
      }}
      onMouseLeave={() => {
        setShowMenu(false);
      }}
    >
      <Image src={buildUrl(src)} />
      {showMenu ? (
        <Menu>
          <Button.Primary
            small
            title="Maximize"
            iconOnly
            onClick={() => setShowLightBoxImage(true)}
          >
            <Icon.Maximize height={16} />
          </Button.Primary>
        </Menu>
      ) : null}
      {showLightboxImage ? (
        <LightBoxModal src={src} close={() => setShowLightBoxImage(false)} />
      ) : null}
    </Container>
  );
};
