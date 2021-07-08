import { t } from "..";
import * as Relay from "./relay-spec";
import * as io from "io-ts";
import { flow, pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";
import * as RT from "fp-ts/lib/ReaderTask";

export const IMAGE_URI = "Image" as const;

const ImageModel = io.type(
  {
    id: io.string,
    url: io.string,
  },
  "Image"
);

export const isTypeOfImage = ImageModel.is;

export type ImageModelType = io.TypeOf<typeof ImageModel>;

export const encodeImageId = Relay.encodeId(IMAGE_URI);

export const decodeImageId = flow(
  Relay.decodeId,
  E.chainW(([, type, id]) =>
    type === IMAGE_URI
      ? E.right(id)
      : E.left(new Error(`Invalid type '${type}'.`))
  )
);

export const resolveImage = (id: string) =>
  pipe(
    RTE.right({
      id: id,
      url: `/images/${id}`,
    }),
    RTE.fold(() => RT.of(null), RT.of)
  );

export const GraphQLImageType = t.objectType<ImageModelType>({
  name: "Image",
  interfaces: [Relay.GraphQLNodeInterface],
  isTypeOf: isTypeOfImage,
  fields: () => [
    t.field({
      name: "id",
      type: t.NonNull(t.ID),
      resolve: ({ id }) => encodeImageId(id),
    }),
    t.field({
      name: "imageId",
      type: t.NonNull(t.ID),
      resolve: ({ id }) => id,
    }),
    t.field({
      name: "url",
      type: t.NonNull(t.String),
      resolve: (record) => record.url,
    }),
  ],
});
