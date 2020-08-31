import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { useQuery } from "relay-hooks";
import { useSplashShareImageAction } from "./hooks/use-splash-share-image-action";
import type { splashShareImageSharedSplashImageQuery } from "./__generated__/splashShareImageSharedSplashImageQuery.graphql";
import { StyledModalBackdrop } from "./modal";
import styled from "@emotion/styled/macro";
import { buildApiUrl } from "./public-url";
import { useToasts } from "react-toast-notifications";
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
  const { addToast } = useToasts();

  if (data.props?.sharedSplashImage) {
    return (
      <StyledModalBackdrop
        onClick={() => {
          if (role === "Player") {
            addToast("Only a DM can dismiss this view.", {
              appearance: "info",
              autoDismiss: true,
            });
          } else if (role === "DM") {
            splashShareImage(null);
          }
        }}
      >
        <LightBoxImage
          src={buildApiUrl(data.props.sharedSplashImage.url)}
          onClick={(ev) => ev.stopPropagation()}
        />
      </StyledModalBackdrop>
    );
  }

  return null;
};
