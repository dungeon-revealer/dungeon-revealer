import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/Either";
import * as RT from "fp-ts/ReaderTask";
import * as Relay from "./relay-spec";
import { t } from "..";
import * as lib from "../../token-image-lib";

export const TOKEN_IMAGE_URI = "TokenImage" as const;

export const isTypeOfTokenImage = lib.TokenImageModel.is;

export const encodeImageId = Relay.encodeId(TOKEN_IMAGE_URI);

export const decodeImageId = flow(
  Relay.decodeId,
  E.chainW(([, type, id]) =>
    type === TOKEN_IMAGE_URI
      ? E.right(id)
      : E.left(new Error(`Invalid type '${type}'.`))
  )
);

const GraphQLTokenImageType = t.objectType<lib.TokenImageType>({
  name: "TokenImage",
  description: "A entity that can be attached to an image.",
  fields: () => [
    t.field("id", {
      type: t.NonNull(t.ID),
      resolve: (record) => encodeImageId(String(record.id)),
    }),
    t.field("url", {
      type: t.NonNull(t.String),
      resolve: (record, _, context) =>
        `${context.publicUrl}/files/token-image/${record.sha256}.${record.extension}`,
    }),
  ],
  interfaces: [Relay.GraphQLNodeInterface],
  isTypeOf: isTypeOfTokenImage,
});

const GraphQLRequestTokenImageUploadDuplicateType = t.objectType<lib.RequestTokenImageUploadDuplicate>(
  {
    name: "RequestTokenImageUploadDuplicate",
    description: "A image with the given SHA-256 does already exist.",
    fields: () => [
      t.field("tokenImage", {
        type: t.NonNull(GraphQLTokenImageType),
        description: "The TokenImage that already exists for the given hash.",
        resolve: (record) => record.tokenImage,
      }),
    ],
  }
);

const GraphQLRequestTokenImageUploadUrlType = t.objectType<lib.RequestTokenImageUploadUrl>(
  {
    name: "RequestTokenImageUploadUrl",
    fields: () => [
      t.field("uploadUrl", {
        type: t.NonNull(t.String),
        resolve: (record) => record.uploadUrl,
      }),
    ],
  }
);

const GraphQLRequestTokenImageUploadResultType = t.unionType<lib.RequestTokenImageUploadResult>(
  {
    name: "RequestImageTokenUploadResult",
    types: [
      GraphQLRequestTokenImageUploadDuplicateType,
      GraphQLRequestTokenImageUploadUrlType,
    ],
    resolveType: (record) => {
      switch (record.type) {
        case "Duplicate":
          return GraphQLRequestTokenImageUploadDuplicateType;
        case "Url":
          return GraphQLRequestTokenImageUploadUrlType;
      }
    },
  }
);

const GraphQLRequestTokenImageUploadInputType = t.inputObjectType({
  name: "RequestTokenImageUploadInput",
  fields: () => ({
    sha256: {
      type: t.NonNullInput(t.String),
      description: "The sha256 of the file that is going to be uploaded.",
    },
    extension: {
      type: t.NonNullInput(t.String),
      description: "The extension of the file thats is going to be uploaded.",
    },
  }),
});

export const queryFields = [];

const GraphQLTokenImageCreateInput = t.inputObjectType({
  name: "TokenImageCreateInput",
  fields: () => ({
    sha256: {
      type: t.NonNullInput(t.String),
      description: "The sha256 of the file that is going to be uploaded.",
    },
  }),
});

const GraphQLTokenImageCreateSuccessType = t.objectType<lib.CreateTokenImageSuccess>(
  {
    name: "TokenImageCreateSuccess",
    fields: () => [
      t.field("createdTokenImage", {
        type: t.NonNull(GraphQLTokenImageType),
        resolve: ({ tokenImageId }, _, context) =>
          RT.run(lib.getTokenImageById(tokenImageId), context),
      }),
    ],
  }
);

const GraphQLTokenImageCreateErrorType = t.objectType({
  name: "TokenImageCreateError",
  fields: () => [
    t.field("reason", {
      type: t.NonNull(t.String),
      resolve: () => "A unexpected error occured.",
    }),
  ],
});

const GraphQLTokenImageCreateResultUnionType = t.unionType<lib.CreateTokenImageResult>(
  {
    name: "TokenImageCreateResult",
    types: [
      GraphQLTokenImageCreateSuccessType,
      GraphQLTokenImageCreateErrorType,
    ],
    resolveType: (obj) => {
      if (obj.type === "Success") {
        return GraphQLTokenImageCreateSuccessType;
      }
      if (obj.type === "Failure") {
        return GraphQLTokenImageCreateErrorType;
      }
      throw new Error("Unexpected runtime type.");
    },
  }
);

export const mutationFields = [
  t.field("requestTokenImageUpload", {
    type: t.NonNull(GraphQLRequestTokenImageUploadResultType),
    args: {
      input: t.arg(t.NonNullInput(GraphQLRequestTokenImageUploadInputType)),
    },
    resolve: (_, args, context) =>
      RT.run(lib.requestTokenImageUpload(args.input), context),
  }),
  t.field("tokenImageCreate", {
    type: t.NonNull(GraphQLTokenImageCreateResultUnionType),
    args: {
      input: t.arg(t.NonNullInput(GraphQLTokenImageCreateInput)),
    },
    resolve: (_, args, context) =>
      RT.run(lib.createTokenImage(args.input), context),
  }),
];

export const subscriptionsFields = [];

export const resolveTokenImage = lib.getTokenById;
