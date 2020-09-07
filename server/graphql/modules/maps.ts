import * as E from "fp-ts/lib/Either";
import * as R from "fp-ts/lib/Reader";
import * as RT from "fp-ts/lib/ReaderTask";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as O from "fp-ts/lib/Option";
import * as io from "io-ts";
import * as StringUtilities from "../../string-utilities";
import { t } from "..";
import * as Relay from "./relay-spec";
import * as lib from "../../maps-lib";
import { flow, pipe } from "fp-ts/lib/function";
import { MapRecord } from "../../maps-db";

export const MAP_URI = "Map" as const;

export const encodeMapId = Relay.encodeId(MAP_URI);

export const decodeMapId = flow(
  Relay.decodeId,
  E.chainW(([, resource, id]) =>
    resource === MAP_URI ? E.right(id) : E.left(new Error("Invalid resource."))
  )
);

const GraphQLMapGridType = t.objectType<lib.MapGridType>({
  name: "MapGrid",
  fields: () => [
    t.field("color", {
      type: t.NonNull(t.String),
      description: "The grid color.",
      resolve: (grid) => grid.color,
    }),
    t.field("sideLength", {
      type: t.NonNull(t.Float),
      description: "The side length of a grid square.",
      resolve: (grid) => grid.sideLength,
    }),
    t.field("x", {
      type: t.NonNull(t.Float),
      description: "The x start coordinate.",
      resolve: (grid) => grid.x,
    }),
    t.field("y", {
      type: t.NonNull(t.Float),
      description: "The y start coordinate.",
      resolve: (grid) => grid.y,
    }),
  ],
});

const GraphQLMapTokenType = t.objectType<lib.MapTokenType>({
  name: "MapToken",
  fields: () => [
    t.field("id", {
      type: t.NonNull(t.ID),
      resolve: (obj) => obj.id,
    }),
    t.field("x", {
      type: t.NonNull(t.Float),
      resolve: (obj) => obj.x,
    }),
    t.field("y", {
      type: t.NonNull(t.Float),
      resolve: (obj) => obj.y,
    }),
    t.field("radius", {
      type: t.NonNull(t.Float),
      resolve: (obj) => obj.radius,
    }),
    t.field("label", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.label,
    }),
  ],
});

const GraphQLMapType = t.objectType<lib.MapRecordType>({
  name: "Map",
  interfaces: [Relay.GraphQLNodeInterface],
  isTypeOf: MapRecord.is,
  fields: () => [
    t.field("id", {
      type: t.NonNull(t.ID),
      resolve: (map) => encodeMapId(map.id),
    }),
    t.field("title", {
      type: t.NonNull(t.String),
      resolve: (map) => map.title,
    }),
    t.field("grid", {
      type: GraphQLMapGridType,
      resolve: (map) => map.grid,
    }),
    t.field("objects", {
      type: t.NonNull(t.List(t.NonNull(GraphQLMapTokenType))),
      resolve: (map) => map.objects,
    }),
  ],
});

type MapLibraryEdgeType = {
  cursor: string;
  node: lib.MapRecordType;
};

type MapLibraryConnectionType = {
  edges: MapLibraryEdgeType[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
};

const MapLibraryConnectionVersion = io.literal("1");
const MapLibraryIdentifier = io.literal("MAP_LIBRARY_CONNECTION");
const MapLibraryCreatedAt = io.number;
const MapLibraryNoteId = io.string;

const MapLibraryConnectionCursorModel = io.tuple([
  MapLibraryConnectionVersion,
  MapLibraryIdentifier,
  MapLibraryCreatedAt,
  MapLibraryNoteId,
]);

const parseIntegerSafe = (input: string) => parseInt(input, 10);

const decodeMapsConnectionCursor = flow(
  Relay.base64Decode,
  StringUtilities.split1(":"),
  O.chain(([version, rest]) => {
    return pipe(
      MapLibraryConnectionVersion.decode(version),
      E.fold(
        () => O.none,
        () => StringUtilities.split1(":")(rest)
      ),
      O.chain(([identifier, rest]) =>
        pipe(
          MapLibraryIdentifier.decode(identifier),
          E.fold(
            () => O.none,
            () => StringUtilities.split1(":")(rest)
          ),
          O.chain(([rawCreatedAt, rest]) => {
            const createdAt = parseIntegerSafe(rawCreatedAt);
            return pipe(
              MapLibraryCreatedAt.decode(createdAt),
              E.fold(
                () => O.none,
                () => O.some([createdAt, rest] as const)
              )
            );
          })
        )
      )
    );
  })
);

const encodeMapLibraryConnectionCursor = ({
  createdAt,
  id,
}: {
  createdAt: number;
  id: string;
}) =>
  pipe(
    MapLibraryConnectionCursorModel.encode([
      "1",
      "MAP_LIBRARY_CONNECTION",
      createdAt,
      id,
    ]),
    (content) => content.join(":"),
    Relay.base64Encode
  );

const GraphQLMapLibraryEdgeType = t.objectType<MapLibraryEdgeType>({
  name: "MapLibraryEdge",
  fields: () => [
    t.field("cursor", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.cursor,
    }),
    t.field("node", {
      type: t.NonNull(GraphQLMapType),
      resolve: (obj) => obj.node,
    }),
  ],
});

const GraphQLMapLibraryConnectionType = t.objectType<MapLibraryConnectionType>({
  name: "MapLibraryConnection",
  fields: () => [
    t.field("edges", {
      type: t.NonNull(t.List(t.NonNull(GraphQLMapLibraryEdgeType))),
      resolve: (obj) => obj.edges,
    }),
    t.field("pageInfo", {
      type: t.NonNull(Relay.GraphQLPageInfoType),
      resolve: (obj) => obj.pageInfo,
    }),
  ],
});

const resolvePaginatedMaps = (
  params: Parameters<typeof lib.loadPaginatedMaps>[0]
) =>
  pipe(
    lib.loadPaginatedMaps({ first: params.first + 1 }),
    RTE.map((listData) =>
      Relay.buildConnectionObject({
        listData,
        amount: params.first,
        encodeCursor: encodeMapLibraryConnectionCursor,
      })
    ),
    RTE.fold(
      (err) => {
        throw err;
      },
      (obj) => RT.of(obj)
    )
  );

const resolveMorePaginatedMaps = (params: { first: number; cursor: string }) =>
  pipe(
    decodeMapsConnectionCursor(params.cursor),
    O.fold(
      () => {
        throw new Error("Invalid cursor.");
      },
      ([lastCreatedAt, lastId]) =>
        pipe(
          lib.loadMorePaginatedMaps({
            first: params.first + 1,
            lastId,
            lastCreatedAt,
          }),
          RTE.map((listData) =>
            Relay.buildConnectionObject({
              listData,
              amount: params.first,
              encodeCursor: encodeMapLibraryConnectionCursor,
            })
          ),
          RTE.fold(
            (err) => {
              throw err;
            },
            (obj) => RT.of(obj)
          )
        )
    )
  );

export const resolveMapByDatabaseId = flow(
  lib.loadMapById,
  RTE.fold(
    (err) => {
      throw err;
    },
    (map) => RT.of(map)
  )
);

export const queryFields = [
  t.field("mapLibrary", {
    type: t.NonNull(GraphQLMapLibraryConnectionType),
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.String),
    },
    resolve: (_obj, args, context) => {
      const first = args.first || 10;
      if (args.after) {
        return RT.run(
          resolveMorePaginatedMaps({ first, cursor: args.after }),
          context
        );
      }
      return RT.run(resolvePaginatedMaps({ first }), context);
    },
  }),

  t.field("activeMap", {
    type: GraphQLMapType,
    resolve: (_obj, _args, context) => {
      return pipe(
        lib.getActiveMap(),
        R.map((map) => map),
        R.map(
          O.fold(
            () => null,
            (map) => map
          )
        )
      )(context);
    },
  }),
];

const GraphQLSetActiveMapInputType = t.inputObjectType({
  name: "SetActiveMapInput",
  fields: () => ({
    mapId: {
      type: t.NonNullInput(t.ID),
    },
  }),
});

export const mutationFields = [
  t.field("setActiveMap", {
    type: t.Boolean,
    args: {
      input: t.arg(t.NonNullInput(GraphQLSetActiveMapInputType)),
    },
    resolve: (_obj, args, context) =>
      RT.run(
        pipe(
          decodeMapId(args.input.mapId),
          RTE.fromEither,
          RTE.chainW((mapId) => lib.setActiveMap({ mapId })),
          RTE.fold(
            (err) => {
              throw err;
            },
            () => RT.of(null)
          )
        ),
        context
      ),
  }),
];
