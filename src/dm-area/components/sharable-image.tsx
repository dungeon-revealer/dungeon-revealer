import React from "react";
import styled from "@emotion/styled/macro";
import { buildApiUrl } from "../../public-url";
import { useShareImageAction } from "../../hooks/use-share-image-action";
import * as Icon from "../../feather-icons";
import * as Button from "../../button";
import { ImageLightBoxModal } from "../../image-lightbox-modal";
import { useCellMeasure } from "../../cell-measure-context";

const Container = styled.span`
  display: block;
  position: relative;

  &:hover [data-menu] {
    display: block;
  }
`;

const Image = styled.img`
  display: inline-block;
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

export const SharableImage: React.FC<{ id: string }> = (props) => {
  const [showLightboxImage, setShowLightBoxImage] = React.useState(false);
  const shareImage = useShareImageAction();
  const measure = useCellMeasure();

  return (
    <Container>
      <Image
        src={buildApiUrl(`/images/${props.id}`)}
        onDoubleClick={(ev) => {
          ev.preventDefault();
          setShowLightBoxImage(true);
        }}
        onLoad={measure}
      />
      <Menu data-menu>
        <Button.Primary
          small
          title="Share with Players"
          iconOnly
          onClick={() => shareImage(props.id)}
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
          src={buildApiUrl(`/images/${props.id}`)}
          close={() => setShowLightBoxImage(false)}
        />
      ) : null}
    </Container>
  );
};
