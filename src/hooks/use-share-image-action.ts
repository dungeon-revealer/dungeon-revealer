import graphql from "babel-plugin-relay/macro";
import { useMutation } from "relay-hooks";

const UseShareImageAction_ShareImageMutation = graphql`
  mutation useShareImageAction_shareImageMutation($input: ShareImageInput!) {
    shareImage(input: $input)
  }
`;

export const useShareImageAction = () => {
  const [mutate] = useMutation(UseShareImageAction_ShareImageMutation);

  return (imageId: string) => mutate({ variables: { input: { imageId } } });
};
