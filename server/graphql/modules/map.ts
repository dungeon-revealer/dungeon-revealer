import * as RT from "fp-ts/lib/ReaderTask";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import * as io from "io-ts";
import * as Relay from "./relay-spec";
import { t } from "..";
import * as lib from "../../map-lib";
import { MapEntity } from "../../maps";
import { IntegerFromString } from "../../io-types/integer-from-string";
import { applyDecoder } from "../../apply-decoder";

const sequenceRT = sequenceT(RT.readerTask);

const GraphQLMapTokenUpdateManyPropertiesInput = t.inputObjectType({
  name: "MapTokenUpdateManyPropertiesInput",
  description:
    "The properties on the tokens that should be updated. Properties that are not provided will remain untouched.",
  fields: () => ({
    color: {
      type: t.String,
      description:
        "Color to be updated. Will not be updated if null is provided.",
    },
    isVisibleForPlayers: {
      type: t.Boolean,
      description:
        "Color to be updated. Will not be updated if null is provided.",
    },
    isMovableByPlayers: {
      type: t.Boolean,
      description:
        "Color to be updated. Will not be updated if null is provided.",
    },
    tokenImageId: {
      type: t.ID,
      description:
        "Token image id to be updated. Will be updated if null is provided.",
    },
    rotation: {
      type: t.Float,
      description:
        "Rotation to be updated. Will not be updated if null is provided.",
    },
  }),
});

const GraphQLMapTokenUpdateManyInput = t.inputObjectType({
  name: "MapTokenUpdateManyInput",
  fields: () => ({
    mapId: {
      type: t.NonNullInput(t.ID),
      description: "The id of the map the token belong to.",
    },
    tokenIds: {
      type: t.NonNullInput(t.ListInput(t.NonNullInput(t.ID))),
      description: "The token ids that should be updated.",
    },
    properties: {
      type: t.NonNullInput(GraphQLMapTokenUpdateManyPropertiesInput),
      description:
        "The properties that should be updated on the affected tokens.",
    },
  }),
});

const GraphQLMapTokenRemoveManyInput = t.inputObjectType({
  name: "MapTokenRemoveManyInput",
  fields: () => ({
    mapId: {
      type: t.NonNullInput(t.ID),
      description: "The id of the map the token belong to.",
    },
    tokenIds: {
      type: t.NonNullInput(t.ListInput(t.NonNullInput(t.ID))),
      description: "The ids of the token that should be removed.",
    },
  }),
});

const GraphQLMapTokenAddManyTokenInput = t.inputObjectType({
  name: "MapTokenAddManyTokenInput",
  fields: () => ({
    x: t.arg(t.NonNullInput(t.Float)),
    y: t.arg(t.NonNullInput(t.Float)),
    color: t.arg(t.NonNullInput(t.String)),
    label: t.arg(t.NonNullInput(t.String)),
    radius: t.arg(t.Float),
    rotation: t.arg(t.Float),
    isVisibleForPlayers: t.arg(t.Boolean),
    isMovableByPlayers: t.arg(t.Boolean),
    isLocked: t.arg(t.Boolean),
    tokenImageId: t.arg(t.ID),
  }),
});

const GraphQLMapTokenAddManyInput = t.inputObjectType({
  name: "MapTokenAddManyInput",
  fields: () => ({
    mapId: t.arg(t.NonNullInput(t.ID)),
    tokens: t.arg(
      t.NonNullInput(
        t.ListInput(t.NonNullInput(GraphQLMapTokenAddManyTokenInput))
      )
    ),
  }),
});

const GraphQLMapCreateInput = t.inputObjectType({
  name: "MapCreateInput",
  fields: () => ({
    mapImageUploadId: t.arg(
      t.NonNullInput(t.ID),
      "The id of the map upload request received via 'Mutation.mapImageRequestUpload'."
    ),
    title: t.arg(t.NonNullInput(t.String)),
  }),
});

const GraphQLMapImageRequestUploadInputType = t.inputObjectType({
  name: "MapImageRequestUploadInput",
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

const GraphQLMapImageRequestUploadResultType =
  t.objectType<lib.MapImageUploadRequestResult>({
    name: "MapImageRequestUploadResult",
    fields: () => [
      t.field({
        name: "id",
        description: "The id of the map image upload request.",
        type: t.NonNull(t.ID),
      }),
      t.field({
        name: "uploadUrl",
        description: "The URL that should be used for uploading the image",
        type: t.NonNull(t.String),
      }),
    ],
  });

const GraphQLMapCreateErrorType = t.objectType<lib.MapCreateError>({
  name: "MapCreateError",
  fields: () => [
    t.field({
      name: "reason",
      type: t.String,
      description: "The reason on why the map creation failed.",
    }),
  ],
});

const GraphQLMapCreateSuccess = t.objectType<lib.MapCreateSuccess>({
  name: "MapCreateSuccess",
  fields: () => [
    t.field({
      name: "createdMap",
      type: t.NonNull(GraphQLMapType),
    }),
  ],
});

const GraphQLMapCreateResult = t.unionType<lib.MapCreateResult>({
  name: "MapCreateResult",
  types: [GraphQLMapCreateErrorType, GraphQLMapCreateSuccess],
  resolveType: (source) => {
    switch (source.type) {
      case "error":
        return GraphQLMapCreateErrorType;
      case "success":
        return GraphQLMapCreateSuccess;
    }
  },
});

const GraphQLMapDeleteInput = t.inputObjectType({
  name: "MapDeleteInput",
  fields: () => ({
    mapId: {
      type: t.NonNullInput(t.String),
      description: "The id of the map that should be deleted.",
    },
  }),
});

const GraphQLMapUpdateTitleResultType = t.objectType<lib.MapUpdateTitleResult>({
  name: "MapUpdateTitleResult",
  fields: () => [
    t.field({
      name: "updatedMap",
      type: t.NonNull(GraphQLMapType),
    }),
  ],
});

const GraphQLMapUpdateTitleInputType = t.inputObjectType({
  name: "MapUpdateTitleInput",
  fields: () => ({
    mapId: {
      type: t.NonNullInput(t.ID),
    },
    newTitle: {
      type: t.NonNullInput(t.String),
    },
  }),
});

export const mutationFields = [
  t.field({
    name: "mapTokenUpdateMany",
    type: t.Boolean,
    args: {
      input: t.arg(t.NonNullInput(GraphQLMapTokenUpdateManyInput)),
    },
    resolve: (_, { input }, context) =>
      RT.run(
        lib.updateManyMapToken({
          mapId: input.mapId,
          tokenIds: new Set(input.tokenIds),
          props: {
            color: input.properties.color ?? undefined,
            isVisibleForPlayers:
              input.properties.isVisibleForPlayers ?? undefined,
            isMovableByPlayers:
              input.properties.isMovableByPlayers ?? undefined,
            tokenImageId: input.properties.tokenImageId,
            rotation: input.properties.rotation ?? undefined,
          },
        }),
        context
      ),
  }),
  t.field({
    name: "mapTokenRemoveMany",
    type: t.Boolean,
    args: {
      input: t.arg(t.NonNullInput(GraphQLMapTokenRemoveManyInput)),
    },
    resolve: (_, { input }, context) =>
      RT.run(
        lib.removeManyMapToken({
          mapId: input.mapId,
          tokenIds: new Set(input.tokenIds),
        }),
        context
      ),
  }),
  t.field({
    name: "mapTokenAddMany",
    description: "Add token to a map",
    type: t.Boolean,
    args: {
      input: t.arg(t.NonNullInput(GraphQLMapTokenAddManyInput)),
    },
    resolve: (_, { input }, context) =>
      RT.run(
        lib.addManyMapToken({
          mapId: input.mapId,
          tokenProps: input.tokens,
        }),
        context
      ),
  }),
  t.field({
    name: "mapImageRequestUpload",
    description: "Request the upload of a token image.",
    type: t.NonNull(GraphQLMapImageRequestUploadResultType),
    args: {
      input: t.arg(t.NonNullInput(GraphQLMapImageRequestUploadInputType)),
    },
    resolve: (_, { input }, context) =>
      RT.run(lib.createMapImageUploadUrl(input), context),
  }),
  t.field({
    name: "mapCreate",
    description: "Create a new map.",
    type: t.NonNull(GraphQLMapCreateResult),
    args: {
      input: t.arg(t.NonNullInput(GraphQLMapCreateInput)),
    },
    resolve: (_, { input }, context) => RT.run(lib.mapCreate(input), context),
  }),
  t.field({
    name: "mapDelete",
    description: "Delete a map.",
    type: t.NonNull(t.Boolean),
    args: {
      input: t.arg(t.NonNullInput(GraphQLMapDeleteInput)),
    },
    resolve: (_, { input }, context) =>
      RT.run(
        pipe(
          lib.mapDelete(input),
          RT.chain(() => RT.of(true))
        ),
        context
      ),
  }),
  t.field({
    name: "mapUpdateTitle",
    description: "Update the title of a map.",
    type: t.NonNull(GraphQLMapUpdateTitleResultType),
    args: {
      input: t.arg(t.NonNullInput(GraphQLMapUpdateTitleInputType)),
    },
    resolve: (_, { input }, context) =>
      RT.run(lib.mapUpdateTitle(input), context),
  }),
];

const GraphQLMapType = t.objectType<MapEntity>({
  name: "Map",
  description: "A map entity.",
  fields: () => [
    t.field({
      name: "id",
      description: "The unique ID of a map.",
      type: t.NonNull(t.ID),
    }),
    t.field({
      name: "title",
      description: "The title of the map.",
      type: t.NonNull(t.String),
    }),
    t.field({
      name: "mapImageUrl",
      description: "The URL of the map image.",
      type: t.NonNull(t.String),
      resolve: (source) => source.mapPath,
    }),
    t.field({
      name: "fogProgressUrl",
      description: "The URL of the fog progress image.",
      type: t.String,
      resolve: (source) => source.fogProgressPath,
    }),
    t.field({
      name: "fogLiveUrl",
      description: "The URL of the fog live image, that is shown to players.",
      type: t.String,
      resolve: (source) => source.fogLivePath,
    }),
  ],
});

type MapEdgeType = {
  cursor: string;
  node: MapEntity;
};

type NoteConnectionType = {
  edges: Array<MapEdgeType>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
};

const GraphQLMapEdgeType = t.objectType<MapEdgeType>({
  name: "MapEdge",
  fields: () => [
    t.field({
      name: "cursor",
      type: t.NonNull(t.String),
      resolve: (edge) => edge.cursor,
    }),
    t.field({
      name: "node",
      type: t.NonNull(GraphQLMapType),
      resolve: (edge) => edge.node,
    }),
  ],
});

const GraphQLMapsConnectionType = t.objectType<NoteConnectionType>({
  name: "MapsConnection",
  description: "A connection of maps.",
  fields: () => [
    t.field({
      name: "edges",
      type: t.NonNull(t.List(t.NonNull(GraphQLMapEdgeType))),
      resolve: (connection) => connection.edges,
    }),
    t.field({
      name: "pageInfo",
      type: t.NonNull(Relay.GraphQLPageInfoType),
      resolve: (obj) => obj.pageInfo,
    }),
  ],
});

const MapsConnectionVersion = io.literal("1");
const MapsConnectionIdentifier = io.literal("MapsConnection");
const MapsConnectionCreatedAt = IntegerFromString;
const MapsConnectionNoteId = io.string;

const MapsConnectionCursorModel = io.tuple([
  MapsConnectionVersion,
  MapsConnectionIdentifier,
  MapsConnectionCreatedAt,
  MapsConnectionNoteId,
]);

const decodeMapsConnectionCursor = (
  cursor: string | null | undefined
): RT.ReaderTask<any, null | { lastCreatedAt: number; lastId: string }> =>
  cursor === "" || cursor == null
    ? RT.of(null)
    : pipe(
        Relay.base64Decode(cursor),
        (value) => value.split(":"),
        applyDecoder(MapsConnectionCursorModel),
        RT.map(([_, __, lastCreatedAt, lastId]) => ({ lastCreatedAt, lastId }))
      );

const encodeMapsConnectionCursor = ({
  createdAt,
  id,
}: {
  createdAt?: number;
  id: string;
}) =>
  pipe(
    MapsConnectionCursorModel.encode([
      "1",
      "MapsConnection",
      createdAt ?? 0,
      id,
    ]),
    (content) => content.join(":"),
    Relay.base64Encode
  );

const resolvePaginatedMaps = ({
  first,
  cursor,
}: {
  first: number;
  cursor: null | {
    lastCreatedAt: number;
    lastId: string;
  };
}) =>
  pipe(
    lib.getPaginatedMaps({ first: first + 1, cursor }),
    RT.map((maps) =>
      Relay.buildConnectionObject<MapEntity>({
        listData: maps,
        amount: first,
        encodeCursor: encodeMapsConnectionCursor,
      })
    )
  );

export const queryFields = [
  t.field({
    name: "maps",
    description: "A connection of all available maps within the library",
    type: t.NonNull(GraphQLMapsConnectionType),
    args: {
      first: t.arg(t.Int, "The amount of items to fetch."),
      after: t.arg(t.String, "Cursor after which items should be fetched."),
    },
    resolve: (_, args, context) =>
      RT.run(
        pipe(
          sequenceRT(
            decodeMapsConnectionCursor(args.after),
            Relay.decodeFirst(50, 10)(args.first)
          ),
          RT.chainW(([cursor, first]) =>
            resolvePaginatedMaps({
              first,
              cursor,
            })
          )
        ),
        context
      ),
  }),
];

export const subscriptionFields = [];
