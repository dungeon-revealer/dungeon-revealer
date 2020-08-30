import graphql from "babel-plugin-relay/macro";
import { useMutation } from "relay-hooks";

const UseSplashShareImageAction_ShareImageMutation = graphql`
  mutation useSplashShareImageAction_splashShareImageMutation(
    $input: SplashShareImageInput!
  ) {
    splashShareImage(input: $input)
  }
`;

export const useSplashShareImageAction = () => {
  const [mutate] = useMutation(UseSplashShareImageAction_ShareImageMutation);

  return (imageId: string | null) =>
    mutate({ variables: { input: { imageId } } });
};
