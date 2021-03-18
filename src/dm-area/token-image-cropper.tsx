import * as React from "react";
import { useQuery } from "relay-hooks";
import type { Area } from "react-easy-crop/types";
import {
  Box,
  Button,
  Flex,
  FormControl,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  FormLabel,
  Input,
  Image,
  Grid,
  GridItem,
  Heading,
} from "@chakra-ui/react";
import graphql from "babel-plugin-relay/macro";
import { loadImage } from "../util";
import { tokenImageCropper_TokenLibraryImagesQuery } from "./__generated__/tokenImageCropper_TokenLibraryImagesQuery.graphql";
import { useStaticRef } from "../hooks/use-static-ref";

const TokenLibraryImagesQuery = graphql`
  query tokenImageCropper_TokenLibraryImagesQuery($sourceImageSha256: String!) {
    tokenImages(first: 20, sourceImageSha256: $sourceImageSha256) {
      edges {
        node {
          id
          title
          url
        }
      }
    }
  }
`;

export const TokenImageCropper = (props: {
  imageUrl: string;
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
}): React.ReactElement => {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(
    null
  );
  const [title, setTitle] = React.useState("New Token Image");
  const data = useQuery<tokenImageCropper_TokenLibraryImagesQuery>(
    TokenLibraryImagesQuery,
    useStaticRef(() => ({
      sourceImageSha256: props.sourceImageHash,
    }))
  );

  return (
    <>
      <Grid
        position="absolute"
        h="100vh"
        width="100%"
        templateRows="repeat(4, 1fr)"
        templateColumns="repeat(5, 1fr)"
        gap={4}
        zIndex={1}
        padding={4}
      >
        <GridItem colSpan={4} rowSpan={3}>
          <Cropper
            image={props.imageUrl}
            crop={crop}
            zoom={zoom}
            onCropChange={setCrop}
            onCropComplete={(_, croppedAreaPixels) => {
              setCroppedAreaPixels(croppedAreaPixels);
            }}
            onZoomChange={setZoom}
            aspect={1}
          />
        </GridItem>
        <GridItem rowSpan={5} colSpan={1} display="flex" alignItems="center">
          {data.data?.tokenImages?.edges.length ? (
            <Stack
              spacing={2}
              padding={3}
              borderRadius={3}
              background="white"
              maxHeight={500}
              zIndex={10}
            >
              <Heading size="xs">Token Images from this Source</Heading>
              <Stack>
                {data.data.tokenImages.edges.map((edge) => (
                  <Grid
                    templateRows="repeat(3, 1fr)"
                    templateColumns="repeat(5, 1fr)"
                    gap={2}
                    height={75}
                  >
                    <GridItem colSpan={2} rowSpan={3}>
                      <Image
                        src={edge.node.url}
                        key={edge.node.id}
                        height={75}
                        width={75}
                      />
                    </GridItem>
                    <GridItem colSpan={3} rowSpan={1}>
                      <Text
                        paddingTop={3}
                        width="100%"
                        backgroundColor="white"
                        fontSize="xs"
                        maxWidth={100}
                        whiteSpace="nowrap"
                        textOverflow="ellipsis"
                        overflow="hidden"
                      >
                        {edge.node.title}
                      </Text>
                    </GridItem>
                    <GridItem colSpan={3} rowSpan={2}>
                      <Button
                        size="sm"
                        onClick={() => {
                          props.onConfirm({
                            type: "TokenImage",
                            tokenImageId: edge.node.id,
                          });
                        }}
                      >
                        Use this image.
                      </Button>
                    </GridItem>
                  </Grid>
                ))}
              </Stack>
            </Stack>
          ) : null}
        </GridItem>
        <GridItem
          colSpan={4}
          rowSpan={2}
          display="flex"
          justifyContent="center"
        >
          <Stack
            background="white"
            padding={5}
            borderRadius={3}
            maxWidth={600}
            spacing={4}
            zIndex={100}
            height="fit-content"
            alignSelf="flex-end"
          >
            <Text fontSize="small">
              Please select a rectangular part from the image that will be used
              as the token image.
            </Text>
            <FormControl id="slider">
              <FormLabel fontSize="small">Zoom</FormLabel>
              <Slider
                aria-label="slider-zoom"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(zoom) => setZoom(zoom)}
                size="sm"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </FormControl>
            <FormControl id="token-title">
              <FormLabel fontSize="small">Title</FormLabel>
              <Input
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                size="sm"
              />
            </FormControl>
            <Stack
              spacing={4}
              direction="row"
              align="center"
              alignSelf="flex-end"
            >
              <Button onClick={props.onClose} variant="ghost">
                Abort
              </Button>
              <Button
                colorScheme="teal"
                isDisabled={croppedAreaPixels === null}
                onClick={async () => {
                  if (!croppedAreaPixels) {
                    return;
                  }
                  const file = await cropImage(
                    props.imageUrl,
                    croppedAreaPixels
                  );
                  props.onConfirm({ type: "File", file, title });
                }}
              >
                Confirm
              </Button>
            </Stack>
          </Stack>
        </GridItem>
      </Grid>
    </>
  );
};

const Cropper = React.lazy(() => import("react-easy-crop"));

const cropImage = async (imageUrl: string, crop: Area) => {
  const image = await loadImage(imageUrl).promise;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const maxSize = Math.max(image.width, image.height);

  // set each dimensions to double largest dimension to allow for a safe area for the
  // image to rotate in without being clipped by canvas context
  canvas.width = maxSize;
  canvas.height = maxSize;

  ctx.drawImage(
    image,
    maxSize / 2 - image.width * 0.5,
    maxSize / 2 - image.height * 0.5
  );
  const data = ctx.getImageData(0, 0, maxSize, maxSize);

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = crop.width;
  canvas.height = crop.height;

  // paste generated rotate image with correct offsets for x,y crop values.
  ctx.putImageData(
    data,
    Math.round(0 - maxSize / 2 + image.width * 0.5 - crop.x),
    Math.round(0 - maxSize / 2 + image.height * 0.5 - crop.y)
  );

  return await new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        return reject(new Error("Unexpected error."));
      }
      resolve(new File([blob], "image.webp"));
    }, "image/webp");
  });
};
