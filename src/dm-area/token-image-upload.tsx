import * as React from "react";
import { useRelayEnvironment } from "relay-hooks";
import { commitMutation } from "relay-runtime";
import graphql from "babel-plugin-relay/macro";
import { generateSHA256FileHash } from "../crypto";
import {
  tokenImageUpload_RequestTokenImageUploadMutation,
  tokenImageUpload_RequestTokenImageUploadMutationResponse,
} from "./__generated__/tokenImageUpload_RequestTokenImageUploadMutation.graphql";
import {
  tokenImageUpload_TokenImageCreateMutation,
  tokenImageUpload_TokenImageCreateMutationResponse,
} from "./__generated__/tokenImageUpload_TokenImageCreateMutation.graphql";
import { TokenImageCropper } from "./token-image-cropper";

const RequestTokenImageUploadMutation = graphql`
  mutation tokenImageUpload_RequestTokenImageUploadMutation(
    $input: RequestTokenImageUploadInput!
  ) {
    requestTokenImageUpload(input: $input) {
      __typename
      ... on RequestTokenImageUploadDuplicate {
        tokenImage {
          id
          title
          url
        }
      }
      ... on RequestTokenImageUploadUrl {
        uploadUrl
      }
    }
  }
`;

const TokenImageCreateMutation = graphql`
  mutation tokenImageUpload_TokenImageCreateMutation(
    $input: TokenImageCreateInput!
    $connections: [ID!]!
  ) {
    tokenImageCreate(input: $input) {
      __typename
      ... on TokenImageCreateSuccess {
        createdTokenImage
          @prependNode(
            connections: $connections
            edgeTypeName: "TokenImageEdge"
          ) {
          id
          title
          url
        }
      }
      ... on TokenImageCreateError {
        reason
      }
    }
  }
`;

/**
 * Hook for creating TokenImage from a File with cropping etc.
 */
export const useTokenImageUpload = () => {
  const [cropTokenImageState, setCropTokenImageState] = React.useState<{
    imageUrl: string;
    fileName: string;
    sourceImageHash: string;
    onConfirm: (
      params:
        | {
            type: "File";
            file: File;
            title: string;
          }
        | {
            type: "TokenImage";
            tokenImageId: string;
          }
    ) => unknown;
    onClose: () => void;
  } | null>(null);

  const objectUrlCleanupRef = React.useRef<null | (() => void)>(null);
  React.useEffect(
    () => () => {
      objectUrlCleanupRef.current?.();
    },
    []
  );

  const environment = useRelayEnvironment();

  const showCropper = (
    file: File,
    connections: Array<string>,
    onSelect?: (tokenImageId: { tokenImageId: string }) => void
  ) => {
    if (!file?.type.match(/image/)) {
      return;
    }

    const uploadFile = async (
      fileHash: string,
      file: File,
      title: string,
      sourceFileHash: string | null
    ) => {
      let tokenImageId: string;

      const { requestTokenImageUpload } =
        await new Promise<tokenImageUpload_RequestTokenImageUploadMutationResponse>(
          (resolve) =>
            commitMutation<tokenImageUpload_RequestTokenImageUploadMutation>(
              environment,
              {
                mutation: RequestTokenImageUploadMutation,
                variables: {
                  input: {
                    sha256: fileHash,
                    extension: "webp",
                  },
                },
                onCompleted: resolve,
              }
            )
        );

      if (requestTokenImageUpload.__typename === "RequestTokenImageUploadUrl") {
        const res = await fetch(requestTokenImageUpload.uploadUrl, {
          method: "PUT",
          body: file,
        });
        if (res.status !== 200) {
          const body = await res.text();
          throw new Error(
            "Received invalid response code: " + res.status + "\n\n" + body
          );
        }
        const { tokenImageCreate } =
          await new Promise<tokenImageUpload_TokenImageCreateMutationResponse>(
            (resolve) =>
              commitMutation<tokenImageUpload_TokenImageCreateMutation>(
                environment,
                {
                  mutation: TokenImageCreateMutation,
                  variables: {
                    input: {
                      title,
                      sha256: fileHash,
                      sourceSha256: sourceFileHash,
                    },
                    connections,
                  },
                  onCompleted: resolve,
                }
              )
          );

        if (tokenImageCreate.__typename !== "TokenImageCreateSuccess") {
          throw new Error("Unexpected response.");
        }
        tokenImageId = tokenImageCreate.createdTokenImage.id;
      } else if (
        requestTokenImageUpload.__typename !==
        "RequestTokenImageUploadDuplicate"
      ) {
        throw new Error("Unexpected case.");
      } else {
        tokenImageId = requestTokenImageUpload.tokenImage.id;
      }
      onSelect?.({ tokenImageId });
    };

    objectUrlCleanupRef.current?.();
    const objectUrl = window.URL.createObjectURL(file);
    objectUrlCleanupRef.current = () => window.URL.revokeObjectURL(objectUrl);

    const fileName = file.name.substring(0, file.name.lastIndexOf("."));

    generateSHA256FileHash(file)
      .then(async (sourceImageHash) => {
        setCropTokenImageState({
          imageUrl: objectUrl,
          fileName,
          sourceImageHash,
          onConfirm: async (params) => {
            if (params.type === "File") {
              const hash = await generateSHA256FileHash(params.file);
              uploadFile(hash, params.file, params.title, sourceImageHash);
            }
            if (params.type === "TokenImage") {
              onSelect?.(params);
            }
            setCropTokenImageState(null);
            objectUrlCleanupRef.current?.();
          },
          onClose: () => {
            setCropTokenImageState(null);
            objectUrlCleanupRef.current?.();
          },
        });
      })
      .catch((err) => {
        // TODO: better error message
        console.error(err);
      });
  };

  return [
    cropTokenImageState === null ? null : (
      <React.Suspense fallback={null}>
        <TokenImageCropper
          key={cropTokenImageState.imageUrl}
          imageUrl={cropTokenImageState.imageUrl}
          initialImageTitle={cropTokenImageState.fileName}
          sourceImageHash={cropTokenImageState.sourceImageHash}
          onConfirm={cropTokenImageState.onConfirm}
          onClose={cropTokenImageState.onClose}
        />
      </React.Suspense>
    ),
    showCropper,
  ] as const;
};
