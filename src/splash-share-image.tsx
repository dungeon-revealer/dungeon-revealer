import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { useQuery } from "relay-hooks";
import { useSplashShareImageAction } from "./hooks/use-splash-share-image-action";
import type { splashShareImageSharedSplashImageQuery } from "./__generated__/splashShareImageSharedSplashImageQuery.graphql";
import { StyledModalBackdrop } from "./modal";
import styled from "@emotion/styled/macro";
import { buildApiUrl } from "./public-url";
import { useToast } from "@chakra-ui/react";
import { useViewerRole } from "./authenticated-app-shell";

const SplashShareImage_SplashShareImageQuery = graphql`
  query splashShareImageSharedSplashImageQuery @live {
    sharedSplashImage {
      id
      url
    }
  }
`;
const LightBoxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  overflow: scroll;
`;

export const SplashShareImage = (): React.ReactElement | null => {
  const data = useQuery<splashShareImageSharedSplashImageQuery>(
    SplashShareImage_SplashShareImageQuery
  );
  const splashShareImage = useSplashShareImageAction();
  const role = useViewerRole();
  const showToast = useToast();

  if (data.data?.sharedSplashImage) {
    return (
      <StyledModalBackdrop
        onClick={() => {
          if (role === "Player") {
            showToast({
              status: "info",
              title: "Only a DM can dismiss this view.",
              isClosable: true,
              duration: 3000,
              position: "top",
            });
          } else if (role === "DM") {
            splashShareImage(null);
          }
        }}
      >
        <LightBoxImage
          src={buildApiUrl(data.data.sharedSplashImage.url)}
          onClick={(ev) => ev.stopPropagation()}
        />
      </StyledModalBackdrop>
    );
  }

  return null;
};
