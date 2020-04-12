import React from "react";
import styled from "@emotion/styled/macro";
import { buildUrl } from "../../public-url";
import { useMarkdownActions } from "../../hooks/use-markdown-actions";
import * as Icon from "../../feather-icons";
import * as Button from "../../button";
import { ImageLightBoxModal } from "../../image-lightbox-modal";

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

export const SharableImage: React.FC<{ src: string }> = ({ src }) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showLightboxImage, setShowLightBoxImage] = React.useState(false);
  const actions = useMarkdownActions();

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
            title="Share with Players"
            iconOnly
            onClick={() => actions.shareImage(src)}
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
      ) : null}
      {showLightboxImage ? (
        <ImageLightBoxModal
          src={src}
          close={() => setShowLightBoxImage(false)}
        />
      ) : null}
    </Container>
  );
};
