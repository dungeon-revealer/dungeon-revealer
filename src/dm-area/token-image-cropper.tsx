import * as React from "react";
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
} from "@chakra-ui/react";
import { loadImage } from "../util";

export const TokenImageCropper = (props: {
  imageUrl: string;
  onConfirm: (file: File) => unknown;
  onClose: () => void;
}): React.ReactElement => {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(
    null
  );
  return (
    <>
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={9000}
      >
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
      </Box>
      <Flex
        position="absolute"
        bottom={3}
        left={0}
        right={0}
        zIndex={9000}
        justifyContent={"center"}
      >
        <Stack
          background="white"
          padding={5}
          borderRadius={3}
          maxWidth={600}
          spacing={4}
        >
          <Text>
            Please select a rectangular part from the image that will be used as
            the token image.
          </Text>
          <FormControl id="slider">
            <FormLabel>Zoom</FormLabel>
            <Slider
              aria-label="slider-zoom"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(zoom) => setZoom(zoom)}
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
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
                const file = await cropImage(props.imageUrl, croppedAreaPixels);
                props.onConfirm(file);
              }}
            >
              Confirm
            </Button>
          </Stack>
        </Stack>
      </Flex>
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
