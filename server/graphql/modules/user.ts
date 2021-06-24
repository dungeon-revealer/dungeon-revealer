import { t } from "..";
import { GraphQLPageInfoType } from "./relay-spec";
import type { UserRecord, UserUpdate } from "../../user";

export const GraphQLUserType = t.objectType<UserRecord>({
  name: "User",
  fields: () => [
    t.field({
      name: "id",
      type: t.NonNull(t.ID),
      resolve: (obj) => obj.id,
    }),
    t.field({
      name: "name",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.name,
    }),
  ],
});

const GraphQLConnectedUserEdgeType = t.objectType<UserRecord>({
  name: "ConnectedUserEdge",
  fields: () => [
    t.field({
      name: "cursor",
      type: t.NonNull(t.String),
      resolve: (input) => input.id,
    }),
    t.field({
      name: "node",
      type: t.NonNull(GraphQLUserType),
      resolve: (input) => input,
    }),
  ],
});

const GraphQLConnectedUserConnectionType = t.objectType<Array<UserRecord>>({
  name: "ConnectedUserConnection",
  fields: () => [
    t.field({
      name: "edges",
      type: t.NonNull(t.List(t.NonNull(GraphQLConnectedUserEdgeType))),
      resolve: (input) => input,
    }),
    t.field({
      name: "pageInfo",
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
    t.field({
      name: "user",
      type: t.NonNull(GraphQLUserType),
      resolve: (obj) => obj,
    }),
  ],
});

export const queryFields = [
  t.field({
    name: "users",
    type: t.NonNull(GraphQLConnectedUserConnectionType),
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.ID),
    },
    resolve: (_, __, ctx) => ctx.user.getUsers(),
  }),
  t.field({
    name: "usersCount",
    type: t.NonNull(t.Int),
    resolve: (_, __, ctx) => ctx.user.getUsers().length,
  }),
  t.field({
    name: "me",
    type: t.NonNull(GraphQLUserType),
    resolve: (_, __, ctx) => {
      const user = ctx.user.get(ctx.session.id);
      if (!user) {
        throw new Error("Invalid state.");
      }
      return user;
    },
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

const GraphQLChangeNameResultType = t.objectType<{ updatedUser: UserRecord }>({
  name: "ChangeNameResult",
  fields: () => [
    t.field({
      name: "me",
      type: t.NonNull(GraphQLUserType),
      resolve: (obj) => obj.updatedUser,
    }),
  ],
});

const GraphQLChangeNameInputType = t.inputObjectType({
  name: "ChangeNameInput",
  fields: () => ({
    name: {
      type: t.NonNullInput(t.String),
    },
  }),
});

export const mutationFields = [
  t.field({
    name: "logIn",
    type: t.NonNull(GraphQLLogInResultType),
    args: {
      input: t.arg(GraphQLLogInInputType),
    },
    resolve: (_, args, context) => {
      if (args.input) {
        let user = context.user.userConnects({
          id: args.input.id,
          name: args.input.name,
        });
        // TODO: we are mutating an object; possibly dangerous ;)
        context.session.id = args.input.id;
        context.socket.once("disconnect", () => {
          context.user.userDisconnects(context.session.id);
        });
        return user;
      } else {
        let user = context.user.get(context.session.id);
        if (user) return user;
        user = context.user.userConnects({
          id: context.session.id,
          name: generateRandomName(),
        });
        if (user) {
          context.socket.once("disconnect", () => {
            context.user.userDisconnects(context.session.id);
          });
        }
        return user;
      }
    },
  }),
  t.field({
    name: "changeName",
    type: t.NonNull(GraphQLChangeNameResultType),
    args: {
      input: t.arg(t.NonNullInput(GraphQLChangeNameInputType)),
    },
    resolve: (_, args, context) => {
      context.user.update({
        id: context.session.id,
        name: args.input.name,
      });
      const updatedUser = context.user.get(context.session.id);
      if (!updatedUser) {
        throw new Error("Invalid State.");
      }
      return {
        updatedUser,
      };
    },
  }),
];

const GraphQLUserAddUpdateType = t.objectType<
  Extract<UserUpdate, { type: "ADD" }>
>({
  name: "UserAddUpdate",
  fields: () => [
    t.field({
      name: "user",
      type: t.NonNull(GraphQLUserType),
      resolve: (obj, _, context) => {
        const user = context.user.get(obj.data.userId);
        if (!user) {
          throw new Error("Invalid state. Could not find user.");
        }
        return user;
      },
    }),
    t.field({
      name: "usersCount",
      type: t.NonNull(t.Int),
      resolve: (_, __, context) => context.user.getUsers().length,
    }),
  ],
});

const GraphQLUserChangeUpdateType = t.objectType<
  Extract<UserUpdate, { type: "CHANGE" }>
>({
  name: "UserChangeUpdate",
  fields: () => [
    t.field({
      name: "user",
      type: t.NonNull(GraphQLUserType),
      resolve: (obj, _, context) => {
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
    t.field({
      name: "userId",
      type: t.NonNull(t.ID),
      resolve: (obj) => obj.data.userId,
    }),
    t.field({
      name: "usersCount",
      type: t.NonNull(t.Int),
      resolve: (_, __, context) => context.user.getUsers().length,
    }),
  ],
});

const GraphQLUserUpdateSubscriptionType = t.unionType<UserUpdate>({
  name: "UserUpdateSubscription",
  types: [
    GraphQLUserAddUpdateType,
    GraphQLUserRemoveType,
    GraphQLUserChangeUpdateType,
  ],
  resolveType: (obj) => {
    if (obj.type === "ADD") return GraphQLUserAddUpdateType;
    else if (obj.type === "REMOVE") return GraphQLUserRemoveType;
    else if (obj.type === "CHANGE") return GraphQLUserChangeUpdateType;
    throw new Error("Invalid state.");
  },
});

export const subscriptionFields = [
  t.subscriptionField({
    name: "userUpdate",
    type: t.NonNull(GraphQLUserUpdateSubscriptionType),
    subscribe: (_, __, context) => context.user.subscribe.userUpdate(),
  }),
];
