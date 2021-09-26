import { flow, pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import * as RT from "fp-ts/lib/ReaderTask";
import { sequenceT } from "fp-ts/lib/Apply";
import * as io from "io-ts";
import * as lib from "../../token-image-lib";
import { IntegerFromString } from "../../io-types/integer-from-string";
import { applyDecoder } from "../../apply-decoder";
import { TokenImageType } from "../../token-image-db";
import { t } from "..";
import * as Relay from "./relay-spec";

export const TOKEN_IMAGE_URI = "TokenImage" as const;

export const isTypeOfTokenImage = lib.TokenImageModel.is;

export const encodeImageId = Relay.encodeId(TOKEN_IMAGE_URI);

export const decodeImageId = flow(
  Relay.decodeId,
  E.chainW(([, type, id]) =>
    type === TOKEN_IMAGE_URI
      ? E.right(parseInt(id, 10))
      : E.left(new Error(`Invalid type '${type}'.`))
  )
);

export const GraphQLTokenImageType = t.objectType<lib.TokenImageType>({
  name: "TokenImage",
  description: "A entity that can be attached to an image.",
  fields: () => [
    t.field({
      name: "id",
      type: t.NonNull(t.ID),
      resolve: (record) => encodeImageId(String(record.id)),
    }),
    t.field({
      name: "title",
      type: t.NonNull(t.String),
      resolve: (record) => record.title,
    }),
    t.field({
      name: "url",
      type: t.NonNull(t.String),
      resolve: (record, _, context) =>
        // prettier-ignore
        `${context.publicUrl}/files/token-image/${record.sha256.toString('hex')}.${record.extension}`,
    }),
  ],
  interfaces: [Relay.GraphQLNodeInterface],
  isTypeOf: isTypeOfTokenImage,
});

const GraphQLRequestTokenImageUploadDuplicateType =
  t.objectType<lib.RequestTokenImageUploadDuplicate>({
    name: "RequestTokenImageUploadDuplicate",
    description: "A image with the given SHA-256 does already exist.",
    fields: () => [
      t.field({
        name: "tokenImage",
        type: t.NonNull(GraphQLTokenImageType),
        description: "The TokenImage that already exists for the given hash.",
        resolve: (record) => record.tokenImage,
      }),
    ],
  });

const GraphQLRequestTokenImageUploadUrlType =
  t.objectType<lib.RequestTokenImageUploadUrl>({
    name: "RequestTokenImageUploadUrl",
    fields: () => [
      t.field({
        name: "uploadUrl",
        type: t.NonNull(t.String),
        resolve: (record) => record.uploadUrl,
      }),
    ],
  });

const GraphQLRequestTokenImageUploadResultType =
  t.unionType<lib.RequestTokenImageUploadResult>({
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
  });

const GraphQLRequestTokenImageUploadInputType = t.inputObjectType({
  name: "RequestTokenImageUploadInput",
  fields: () => ({
    sha256: {
      type: t.NonNullInput(t.String),
      description:
        "The SHA256 of the file that is going to be uploaded in hexadecimal form.",
    },
    extension: {
      type: t.NonNullInput(t.String),
      description: "The extension of the file thats is going to be uploaded.",
    },
  }),
});

const TokenImageConnectionVersion = io.literal("1");
const TokenImageConnectionIdentifier = io.literal("TokenImages");
const TokenImageConnectionCreatedAt = IntegerFromString;
const TokenImageConnectionTokenImageId = IntegerFromString;

const TokenImageConnectionCursorModel = io.tuple([
  TokenImageConnectionVersion,
  TokenImageConnectionIdentifier,
  TokenImageConnectionCreatedAt,
  TokenImageConnectionTokenImageId,
]);

const buildTokenImagesCursor = (record: TokenImageType) =>
  pipe(
    ["1", "TokenImages", record.createdAt, record.id].join(":"),
    Relay.base64Encode
  );

const decodeTokenImagesCursor = (
  cursor: string | null | undefined
): RT.ReaderTask<any, null | { lastCreatedAt: number; lastId: number }> =>
  cursor === "" || cursor == null
    ? RT.of(null)
    : pipe(
        Relay.base64Decode(cursor),
        (value) => value.split(":"),
        applyDecoder(TokenImageConnectionCursorModel),
        RT.map(([_, __, lastCreatedAt, lastId]) => ({ lastCreatedAt, lastId }))
      );

type TokenImageEdgeType = {
  cursor: string;
  node: lib.TokenImageType;
};

const GraphQLTokenImageEdgeObjectType = t.objectType<TokenImageEdgeType>({
  name: "TokenImageEdge",
  fields: () => [
    t.field({
      name: "cursor",
      type: t.NonNull(t.String),
      resolve: (source) => source.cursor,
    }),
    t.field({
      name: "node",
      type: t.NonNull(GraphQLTokenImageType),
      resolve: (source) => source.node,
    }),
  ],
});

type TokenImageConnectionType = {
  edges: TokenImageEdgeType[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
};

const GraphQLTokenImageConnectionObjectType =
  t.objectType<TokenImageConnectionType>({
    name: "TokenImageConnection",
    fields: () => [
      t.field({
        name: "edges",
        type: t.NonNull(t.List(t.NonNull(GraphQLTokenImageEdgeObjectType))),
        resolve: (source) => source.edges,
      }),
      t.field({
        name: "pageInfo",
        type: t.NonNull(Relay.GraphQLPageInfoType),
        resolve: (source) => source.pageInfo,
      }),
    ],
  });

const sequenceReaderTask = sequenceT(RT.readerTask);

export const queryFields = [
  t.field({
    name: "tokenImages",
    type: GraphQLTokenImageConnectionObjectType,
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.String),
      sourceImageSha256: t.arg(t.String),
      titleFilter: t.arg(t.String),
    },
    resolve: (_, args, context) =>
      RT.run(
        pipe(
          sequenceReaderTask(
            decodeTokenImagesCursor(args.after),
            Relay.decodeFirst(50)(args.first)
          ),
          RT.chainW(([cursor, first]) =>
            pipe(
              lib.getPaginatedTokenImages({
                first: first + 1,
                cursor,
                sourceSha256: args.sourceImageSha256 ?? null,
                titleFilter: args.titleFilter ?? null,
              }),
              RT.map((records) =>
                Relay.buildConnectionObject({
                  listData: records,
                  amount: first,
                  encodeCursor: buildTokenImagesCursor,
                })
              )
            )
          )
        ),
        context
      ),
  }),
];

const GraphQLTokenImageCreateInput = t.inputObjectType({
  name: "TokenImageCreateInput",
  fields: () => ({
    title: {
      type: t.NonNullInput(t.String),
      description: "The title of the token image.",
    },
    sha256: {
      type: t.NonNullInput(t.String),
      description:
        "The SHA256 of the file that has been uploaded in hexadecimal form.",
    },
    sourceSha256: {
      type: t.String,
      description:
        "The SHA256 of the file the image got cut out from in hexadecimal form.",
    },
  }),
});

const GraphQLTokenImageCreateSuccessType =
  t.objectType<lib.CreateTokenImageSuccess>({
    name: "TokenImageCreateSuccess",
    fields: () => [
      t.field({
        name: "createdTokenImage",
        type: t.NonNull(GraphQLTokenImageType),
        resolve: ({ tokenImageId }, _, context) =>
          RT.run(lib.getTokenImageById(tokenImageId), context),
      }),
    ],
  });

const GraphQLTokenImageCreateErrorType = t.objectType({
  name: "TokenImageCreateError",
  fields: () => [
    t.field({
      name: "reason",
      type: t.NonNull(t.String),
      resolve: () => "A unexpected error occurred.",
    }),
  ],
});

const GraphQLTokenImageCreateResultUnionType =
  t.unionType<lib.CreateTokenImageResult>({
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
  });

export const mutationFields = [
  t.field({
    name: "requestTokenImageUpload",
    type: t.NonNull(GraphQLRequestTokenImageUploadResultType),
    args: {
      input: t.arg(t.NonNullInput(GraphQLRequestTokenImageUploadInputType)),
    },
    resolve: (_, args, context) =>
      RT.run(lib.requestTokenImageUpload(args.input), context),
  }),
  t.field({
    name: "tokenImageCreate",
    type: t.NonNull(GraphQLTokenImageCreateResultUnionType),
    args: {
      input: t.arg(t.NonNullInput(GraphQLTokenImageCreateInput)),
    },
    resolve: (_, args, context) =>
      RT.run(
        lib.createTokenImage({
          title: args.input.title,
          sha256: args.input.sha256,
          sourceSha256: args.input.sourceSha256 ?? null,
        }),
        context
      ),
  }),
];

export const subscriptionsFields = [];

export const resolveTokenImage = lib.getTokenById;
