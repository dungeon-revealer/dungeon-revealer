import * as RT from "fp-ts/lib/ReaderTask";
import { sequenceT } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import * as io from "io-ts";
import * as Relay from "./relay-spec";
import { t } from "..";
import * as lib from "../../map-lib";
import { MapEntity, MapGridEntity, MapTokenEntity } from "../../maps";
import { IntegerFromString } from "../../io-types/integer-from-string";
import { applyDecoder } from "../../apply-decoder";
import { decodeImageId, GraphQLTokenImageType } from "./token-image";
import { getTokenImageById } from "../../token-image-lib";
import { randomUUID } from "crypto";

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

const GraphQLMapUpdateGridResultType = t.objectType<lib.MapUpdateGridResult>({
  name: "MapUpdateGridResult",
  fields: () => [
    t.field({
      name: "updatedMap",
      type: t.NonNull(GraphQLMapType),
    }),
  ],
});

const GraphQLGridInputType = t.inputObjectType({
  name: "GridInput",
  fields: () => ({
    color: {
      type: t.NonNullInput(t.String),
    },
    offsetX: { type: t.NonNullInput(t.Float) },
    offsetY: { type: t.NonNullInput(t.Float) },
    columnWidth: { type: t.NonNullInput(t.Float) },
    columnHeight: { type: t.NonNullInput(t.Float) },
  }),
});

const GraphQLMapUpdateGridInputType = t.inputObjectType({
  name: "MapUpdateGridInput",
  fields: () => ({
    mapId: {
      type: t.NonNullInput(t.ID),
    },
    grid: {
      type: t.NonNullInput(GraphQLGridInputType),
    },
    showGrid: {
      type: t.NonNullInput(t.Boolean),
    },
    showGridToPlayers: {
      type: t.NonNullInput(t.Boolean),
    },
  }),
});

const GraphQLMapPingInputType = t.inputObjectType({
  name: "MapPingInput",
  fields: () => ({
    mapId: {
      type: t.NonNullInput(t.ID),
    },
    x: {
      type: t.NonNullInput(t.Float),
    },
    y: {
      type: t.NonNullInput(t.Float),
    },
  }),
});

const GraphQLPositionInputType = t.inputObjectType({
  name: "PositionInput",
  fields: () => ({
    x: {
      type: t.NonNullInput(t.Float),
    },
    y: {
      type: t.NonNullInput(t.Float),
    },
  }),
});

const GraphQLMapMoveInputType = t.inputObjectType({
  name: "MapMoveInput",
  fields: () => ({
    mapId: {
      type: t.NonNullInput(t.ID),
    },
    scale: {
      type: t.NonNullInput(t.Float),
    },
    position: {
      type: t.NonNullInput(GraphQLPositionInputType),
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
  t.field({
    name: "mapUpdateGrid",
    description: "Update the grid of a map.",
    type: t.NonNull(GraphQLMapUpdateGridResultType),
    args: {
      input: t.arg(t.NonNullInput(GraphQLMapUpdateGridInputType)),
    },
    resolve: (_, { input }, context) =>
      RT.run(lib.mapUpdateGrid(input), context),
  }),
  t.field({
    name: "mapPing",
    description: "Ping a point on the map.",
    type: t.Boolean,
    args: {
      input: t.arg(t.NonNullInput(GraphQLMapPingInputType)),
    },
    resolve: (_, args, context) => {
      context.pubSub.publish("mapPing", args.input.mapId, {
        x: args.input.x,
        y: args.input.y,
        id: randomUUID(),
      });
      return null;
    },
  }),
  t.field({
    name: "mapMove",
    description: "DM move or zoom map to update clients.",
    type: t.Boolean,
    args: {
      input: t.arg(t.NonNullInput(GraphQLMapMoveInputType)),
    },
    resolve: (_, args, context) => {
      if (context.session.role !== "admin") {
        return null;
      }

      context.pubSub.publish("mapMove", args.input.mapId, {
        scale: args.input.scale,
        position: {
          x: args.input.position.x,
          y: args.input.position.y,
        },
        id: randomUUID(),
      });
      return null;
    },
  }),
];

const GraphQLMapGridType = t.objectType<MapGridEntity>({
  name: "MapGrid",
  fields: () => [
    t.field({
      name: "color",
      type: t.NonNull(t.String),
    }),
    t.field({
      name: "offsetX",
      type: t.NonNull(t.Float),
    }),
    t.field({
      name: "offsetY",
      type: t.NonNull(t.Float),
    }),
    t.field({
      name: "columnWidth",
      type: t.NonNull(t.Float),
    }),
    t.field({
      name: "columnHeight",
      type: t.NonNull(t.Float),
    }),
  ],
});

const GraphQLMapTokenType = t.objectType<MapTokenEntity>({
  name: "MapToken",
  description: "A token on the map.",
  fields: () => [
    t.field({
      name: "id",
      type: t.NonNull(t.ID),
    }),
    t.field({
      name: "x",
      type: t.NonNull(t.Float),
    }),
    t.field({
      name: "y",
      type: t.NonNull(t.Float),
    }),
    t.field({
      name: "rotation",
      type: t.NonNull(t.Float),
    }),
    t.field({
      name: "radius",
      type: t.NonNull(t.Float),
    }),
    t.field({
      name: "color",
      type: t.NonNull(t.String),
    }),
    t.field({
      name: "label",
      type: t.NonNull(t.String),
    }),
    t.field({
      name: "isVisibleForPlayers",
      type: t.NonNull(t.Boolean),
    }),
    t.field({
      name: "isMovableByPlayers",
      type: t.NonNull(t.Boolean),
    }),
    t.field({
      name: "isLocked",
      type: t.NonNull(t.Boolean),
    }),
    t.field({
      name: "tokenImage",
      type: GraphQLTokenImageType,
      resolve: (source, _, context) =>
        source.tokenImageId
          ? RT.run(
              pipe(
                decodeImageId(source.tokenImageId),
                E.fold(
                  () =>
                    (() => () =>
                      Promise.reject(
                        new Error(
                          "TODO: This should be a better error message :)"
                        )
                      )) as ReturnType<typeof getTokenImageById>,
                  getTokenImageById
                )
              ),
              context
            )
          : null,
    }),
    t.field({
      name: "referenceId",
      type: t.ID,
      resolve: (source) => source.reference?.id ?? null,
    }),
  ],
});

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
      resolve: (source, _, context) =>
        `${context.publicUrl}/api/map/${
          source.id
        }/map?authorization=${encodeURIComponent(
          (context.session.role === "admin"
            ? process.env["DM_PASSWORD"]
            : context.session.role === "user"
            ? process.env["PC_PASSWORD"]
            : null) ?? ""
        )}`,
    }),
    t.field({
      name: "fogProgressImageUrl",
      description:
        "The URL of the fog progress image that is only accessible to the DM.",
      type: t.String,
      resolve: (source, _, context) =>
        `${context.publicUrl}/api/map/${
          source.id
        }/fog?authorization=${encodeURIComponent(
          (context.session.role === "admin"
            ? process.env["DM_PASSWORD"]
            : context.session.role === "user"
            ? process.env["PC_PASSWORD"]
            : null) ?? ""
        )}&cache_buster=${source.fogProgressRevision}`,
    }),
    t.field({
      name: "fogLiveImageUrl",
      description: "The URL of the fog live image, that is shown to players.",
      type: t.String,
      resolve: (source, _, context) =>
        `${context.publicUrl}/api/map/${
          source.id
        }/fog-live?authorization=${encodeURIComponent(
          (context.session.role === "admin"
            ? process.env["DM_PASSWORD"]
            : context.session.role === "user"
            ? process.env["PC_PASSWORD"]
            : null) ?? ""
        )}&cache_buster=${source.fogLiveRevision}`,
    }),
    t.field({
      name: "grid",
      description:
        "The grid of the map. Is 'null' if no grid has been configured.",
      type: GraphQLMapGridType,
    }),
    t.field({
      name: "showGrid",
      type: t.NonNull(t.Boolean),
    }),
    t.field({
      name: "showGridToPlayers",
      type: t.NonNull(t.Boolean),
    }),
    t.field({
      name: "tokens",
      type: t.NonNull(t.List(t.NonNull(GraphQLMapTokenType))),
      resolve: (source, _, context) =>
        context.session.role === "admin"
          ? source.tokens
          : source.tokens.filter((token) => token.isVisibleForPlayers),
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
  titleNeedle,
}: {
  first: number;
  cursor: null | {
    lastCreatedAt: number;
    lastId: string;
  };
  titleNeedle: string | null;
}) =>
  pipe(
    lib.getPaginatedMaps({ first: first + 1, cursor, titleNeedle }),
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
      titleNeedle: t.arg(t.String, "Needle for filtering the items."),
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
              titleNeedle: args.titleNeedle ?? null,
            })
          )
        ),
        context
      ),
  }),
  t.field({
    name: "activeMap",
    description: "The active map that is shared with the players.",
    type: GraphQLMapType,
    resolve: (_, __, context) => RT.run(lib.getActiveMap(), context),
  }),
  t.field({
    name: "map",
    description: "Get a map by id.",
    type: GraphQLMapType,
    args: {
      id: t.arg(t.NonNullInput(t.ID)),
    },
    resolve: (_, args, context) =>
      RT.run(lib.getMapById({ mapId: args.id }), context),
  }),
];

const GraphQLMapPingType = t.objectType<lib.MapPing>({
  name: "MapPing",
  fields: () => [
    t.field({
      name: "id",
      type: t.NonNull(t.ID),
    }),
    t.field({
      name: "x",
      type: t.NonNull(t.Float),
    }),
    t.field({
      name: "y",
      type: t.NonNull(t.Float),
    }),
  ],
});

const GraphQLMapPositionType = t.objectType<lib.MapPosition>({
  name: "MapPosition",
  fields: () => [
    t.field({
      name: "x",
      type: t.NonNull(t.Float),
    }),
    t.field({
      name: "y",
      type: t.NonNull(t.Float),
    }),
  ],
});

const GraphQLMapMoveType = t.objectType<lib.MapMove>({
  name: "mapMove",
  fields: () => [
    t.field({
      name: "id",
      type: t.NonNull(t.ID),
    }),
    t.field({
      name: "scale",
      type: t.NonNull(t.Float),
    }),
    t.field({
      name: "position",
      type: t.NonNull(GraphQLMapPositionType),
    }),
  ],
});

export const subscriptionFields = [
  t.subscriptionField({
    name: "mapPing",
    type: t.NonNull(GraphQLMapPingType),
    args: {
      mapId: t.arg(t.NonNullInput(t.ID)),
    },
    subscribe: (_, args, context) =>
      context.pubSub.subscribe("mapPing", args.mapId),
  }),
  t.subscriptionField({
    name: "mapMove",
    type: t.NonNull(GraphQLMapMoveType),
    args: {
      mapId: t.arg(t.NonNullInput(t.ID)),
    },
    subscribe: (_, args, context) =>
      context.pubSub.subscribe("mapMove", args.mapId),
  }),
];
