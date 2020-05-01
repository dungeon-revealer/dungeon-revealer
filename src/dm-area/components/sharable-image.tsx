import React from "react";
import styled from "@emotion/styled/macro";
import { buildApiUrl } from "../../public-url";
import { useShareImageAction } from "../../hooks/use-share-image-action";
import * as Icon from "../../feather-icons";
import * as Button from "../../button";
import { ImageLightBoxModal } from "../../image-lightbox-modal";

const Container = styled.span`
  display: block;
  position: relative;

  &:hover [data-menu] {
    display: block;
  }
`;

const Image = styled.img`
  max-width: 100%;
`;

const Menu = styled.span`
  display: none;
  position: absolute;
  top: 0;
  right: 0;
  margin-top: 4px;
  margin-right: 4px;
  > * {
    margin-left: 8px;
  }
`;

export const SharableImage: React.FC<{ id: string }> = ({ id }) => {
  const [showLightboxImage, setShowLightBoxImage] = React.useState(false);
  const shareImage = useShareImageAction();

  return (
    <Container>
      <Image src={buildApiUrl(`/images/${id}`)} />
      <Menu data-menu>
        <Button.Primary
          small
          title="Share with Players"
          iconOnly
          onClick={() => shareImage(id)}
        >
          <Icon.Share height={16} />
        </Button.Primary>
        <Button.Primary
          small
          title="Maximize"
          iconOnly
          onClick={() => setShowLightBoxImage(true)}
        >
          <Icon.Maximize height={16} />
        </Button.Primary>
      </Menu>
      {showLightboxImage ? (
        <ImageLightBoxModal
          src={buildApiUrl(`/images/${id}`)}
          close={() => setShowLightBoxImage(false)}
        />
      ) : null}
    </Container>
  );
};
