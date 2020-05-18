import { t } from "../..";
import { GraphQLPageInfoType } from "../relay-spec";
import type { UserRecord, UserUpdate } from "../../../user";

export const GraphQLUserType = t.objectType<UserRecord>({
  name: "User",
  fields: () => [
    t.field("id", {
      type: t.NonNull(t.ID),
      resolve: (obj) => obj.id,
    }),
    t.field("name", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.name,
    }),
  ],
});

const GraphQLConnectedUserEdgeType = t.objectType<UserRecord>({
  name: "ConnectedUserEdge",
  fields: () => [
    t.field("cursor", {
      type: t.NonNull(t.String),
      resolve: (input) => input.id,
    }),
    t.field("node", {
      type: t.NonNull(GraphQLUserType),
      resolve: (input) => input,
    }),
  ],
});

const GraphQLConnectedUserConnectionType = t.objectType<Array<UserRecord>>({
  name: "ConnectedUserConnection",
  fields: () => [
    t.field("edges", {
      type: t.NonNull(t.List(t.NonNull(GraphQLConnectedUserEdgeType))),
      resolve: (input) => input,
    }),
    t.field("pageInfo", {
      type: t.NonNull(GraphQLPageInfoType),
      resolve: () => ({}),
    }),
  ],
});

const GraphQLLogInInputType = t.inputObjectType({
  name: "LogInInput",
  fields: () => ({
    id: {
      type: t.NonNullInput(t.String),
    },
    name: {
      type: t.NonNullInput(t.String),
    },
  }),
});

const GraphQLLogInResultType = t.objectType<UserRecord>({
  name: "LogInResult",
  fields: () => [
    t.field("user", {
      type: t.NonNull(GraphQLUserType),
      resolve: (obj) => obj,
    }),
  ],
});

export const queryFields = [
  t.field("users", {
    type: t.NonNull(GraphQLConnectedUserConnectionType),
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.ID),
    },
    resolve: (_, args, ctx) => ctx.user.getUsers(),
  }),
];

const generateRandomName = (() => {
  const pool1 = [
    "funny",
    "angry",
    "cool",
    "swaggy",
    "lil",
    "young",
    "angry",
    "slim",
    "cool",
  ];

  const pool2 = ["potato", "sock", "lion", "jesus", "tiger", "dragon", "ape"];

  const random = (min: number, max: number) =>
    Math.floor(Math.random() * Math.floor(max - min + 1)) + min;

  const capitalize = (input: string) =>
    input[0].toUpperCase() + input.substr(1);

  const generateRandomName = () => {
    const word1 = pool1[random(0, pool1.length - 1)];
    const word2 = pool2[random(0, pool2.length - 1)];
    return capitalize(word1) + capitalize(word2) + String(random(0, 999));
  };

  return generateRandomName;
})();

export const mutationFields = [
  t.field("logIn", {
    type: t.NonNull(GraphQLLogInResultType),
    args: {
      input: t.arg(GraphQLLogInInputType),
    },
    resolve: (obj, args, context) => {
      if (args.input) {
        let user = context.user.get(args.input.id);
        if (!user) {
          user = context.user.add({
            id: args.input.id,
            name: args.input.name,
          });
        }
        context.setSessionId(args.input.id);
        return user;
      } else {
        let user = context.user.get(context.sessionId);
        if (user) return user;
        user = context.user.add({
          id: context.sessionId,
          name: generateRandomName(),
        });
        return user;
      }
    },
  }),
];

const GraphQLUserAddUpdateType = t.objectType<
  Extract<UserUpdate, { type: "ADD" }>
>({
  name: "UserAddUpdate",
  fields: () => [
    t.field("user", {
      type: t.NonNull(GraphQLUserType),
      resolve: (obj, args, context) => {
        const user = context.user.get(obj.data.userId);
        if (!user) {
          throw new Error("Invalid state. Could not find user.");
        }
        return user;
      },
    }),
  ],
});

const GraphQLUserRemoveType = t.objectType<
  Extract<UserUpdate, { type: "REMOVE" }>
>({
  name: "UserRemoveUpdate",
  fields: () => [
    t.field("userId", {
      type: t.NonNull(t.ID),
      resolve: (obj) => obj.data.userId,
    }),
  ],
});

const GraphQLUserUpdateSubscriptionType = t.unionType<UserUpdate>({
  name: "UserUpdateSubscription",
  types: [GraphQLUserAddUpdateType, GraphQLUserRemoveType],
  resolveType: (obj) => {
    if (obj.type === "ADD") return GraphQLUserAddUpdateType;
    else if (obj.type === "REMOVE") return GraphQLUserRemoveType;
    throw new Error("Invalid state.");
  },
});

export const subscriptionFields = [
  t.subscriptionField("userUpdate", {
    type: t.NonNull(GraphQLUserUpdateSubscriptionType),
    subscribe: (obj, args, context) => context.user.subscribe.userUpdate(),
    resolve: (obj) => obj as any,
  }),
];
