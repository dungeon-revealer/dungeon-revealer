import * as RT from "fp-ts/lib/ReaderTask";
import { t } from "..";
import * as lib from "../../map-lib";

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

export const mutationFields = [
  t.field("mapTokenUpdateMany", {
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
  t.field("mapTokenRemoveMany", {
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
  t.field("mapTokenAddMany", {
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
];

export const queryFields = [];

export const subscriptionFields = [];
