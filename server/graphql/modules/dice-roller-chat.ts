import { t } from "..";
import { GraphQLPageInfoType } from "./relay-spec";
import * as ImageModule from "./image";
import * as NotesModule from "./notes";
import type { ApplicationRecordSchema, NewMessagesPayload } from "../../chat";
import type { DiceRollDetail, DiceRollResult } from "../../roll-dice";
import * as E from "fp-ts/lib/Either";
import * as RT from "fp-ts/lib/ReaderTask";

type ChatMessageType = ApplicationRecordSchema;
type UserChatMessageType = Extract<ChatMessageType, { type: "USER_MESSAGE" }>;
type OperationalChatMessageType = Extract<
  ChatMessageType,
  { type: "OPERATIONAL_MESSAGE" }
>;
type SharedResourceChatMessageType = Extract<
  ChatMessageType,
  { type: "SHARED_RESOURCE" }
>;

enum DiceRollType {
  DEFAULT = "DEFAULT",
  MAX = "MAX",
  MIN = "MIN",
}

const GraphQLDiceRollCategory = t.enumType<DiceRollType>({
  name: "DiceRollCategory",
  values: [
    { name: "DEFAULT", value: DiceRollType.DEFAULT },
    { name: "MAX", value: DiceRollType.MAX },
    { name: "MIN", value: DiceRollType.MIN },
  ],
});

const GraphQLDiceRollResult = t.objectType<{
  dice: string;
  result: number;
  category: DiceRollType;
  crossedOut: boolean;
}>({
  name: "DiceRollResult",
  fields: () => [
    t.field({
      name: "dice",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.dice,
    }),
    t.field({
      name: "result",
      type: t.NonNull(t.Float),
      resolve: (obj) => obj.result,
    }),
    t.field({
      name: "category",
      type: t.NonNull(GraphQLDiceRollCategory),
      resolve: (obj) => obj.category,
    }),
    t.field({
      name: "crossedOut",
      type: t.NonNull(t.Boolean),
      resolve: (obj) => obj.crossedOut,
    }),
  ],
});

const GraphQLDiceRollDetailNode = t.interfaceType<DiceRollDetail>({
  name: "DiceRollDetail",
  fields: () => [
    t.abstractField({ name: "content", type: t.NonNull(t.String) }),
  ],
});

const GraphQLDiceRollOperatorNode = t.objectType<
  Extract<DiceRollDetail, { type: "Operator" }>
>({
  name: "DiceRollOperatorNode",
  interfaces: [GraphQLDiceRollDetailNode],
  isTypeOf: (src) => src?.type === "Operator",
  fields: () => [
    t.field({
      name: "content",
      type: t.NonNull(t.String),
      resolve: (object) => object.content,
    }),
  ],
});

const GraphQLDiceRollConstantNode = t.objectType<
  Extract<DiceRollDetail, { type: "Constant" }>
>({
  name: "DiceRollConstantNode",
  interfaces: [GraphQLDiceRollDetailNode],
  isTypeOf: (src) => src?.type === "Constant",
  fields: () => [
    t.field({
      name: "content",
      type: t.NonNull(t.String),
      resolve: (object) => object.content,
    }),
  ],
});

const GraphQLDiceRollDiceRollNode = t.objectType<
  Extract<DiceRollDetail, { type: "DiceRoll" }>
>({
  name: "DiceRollDiceRollNode",
  interfaces: [GraphQLDiceRollDetailNode],
  isTypeOf: (src) => src?.type === "DiceRoll",
  fields: () => [
    t.field({
      name: "content",
      type: t.NonNull(t.String),
      resolve: (object) => object.content,
    }),
    t.field({
      name: "min",
      type: t.NonNull(t.Float),
      resolve: (object) => object.detail.min,
    }),
    t.field({
      name: "max",
      type: t.NonNull(t.Float),
      resolve: (object) => object.detail.max,
    }),
    t.field({
      name: "rollResults",
      type: t.NonNull(t.List(t.NonNull(GraphQLDiceRollResult))),
      resolve: (object) =>
        object.rolls.map((result) => ({
          dice: object.content.substring(1),
          result: result.value,
          crossedOut: result.crossedOut,
          category:
            result.value === object.detail.min
              ? DiceRollType.MIN
              : result.value === object.detail.max
              ? DiceRollType.MAX
              : DiceRollType.DEFAULT,
        })),
    }),
  ],
});

const GraphQLDiceRollOpenParenNode = t.objectType<
  Extract<DiceRollDetail, { type: "OpenParen" }>
>({
  name: "DiceRollOpenParenNode",
  interfaces: [GraphQLDiceRollDetailNode],
  isTypeOf: (src) => src?.type === "OpenParen",
  fields: () => [
    t.field({
      name: "content",
      type: t.NonNull(t.String),
      resolve: (object) => object.content,
    }),
  ],
});

const GraphQLDiceRollCloseParenNode = t.objectType<
  Extract<DiceRollDetail, { type: "CloseParen" }>
>({
  name: "DiceRollCloseParenNode",
  interfaces: [GraphQLDiceRollDetailNode],
  isTypeOf: (src) => src?.type === "CloseParen",
  fields: () => [
    t.field({
      name: "content",
      type: t.NonNull(t.String),
      resolve: (object) => object.content,
    }),
  ],
});

const GraphQLChatMessageDiceRoll = t.objectType<DiceRollResult>({
  name: "DiceRoll",
  fields: () => [
    t.field({
      name: "result",
      type: t.NonNull(t.Float),
      resolve: (input) => input.result,
    }),
    t.field({
      name: "detail",
      type: t.NonNull(t.List(t.NonNull(GraphQLDiceRollDetailNode))),
      resolve: (input) => input.detail,
    }),
    t.field({
      name: "rollId",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.id,
    }),
  ],
});

const GraphQLChatMessageInterfaceType = t.interfaceType<ChatMessageType>({
  name: "ChatMessage",
  fields: () => [t.abstractField({ name: "id", type: t.NonNull(t.ID) })],
});

const GraphQLTextChatMessageInterfaceType = t.interfaceType<ChatMessageType>({
  name: "TextChatMessage",
  interfaces: [GraphQLChatMessageInterfaceType],
  fields: () => [
    t.abstractField({ name: "id", type: t.NonNull(t.ID) }),
    t.abstractField({ name: "content", type: t.NonNull(t.String) }),
    t.abstractField({ name: "createdAt", type: t.NonNull(t.String) }),
    t.abstractField({ name: "containsDiceRoll", type: t.NonNull(t.Boolean) }),
  ],
});

const GraphQLSharedResourceEnumType = t.unionType<
  NotesModule.NoteModelType | ImageModule.ImageModelType
>({
  name: "SharedResource",
  types: [NotesModule.GraphQLNoteType, ImageModule.GraphQLImageType],
  resolveType: (input) => {
    if (NotesModule.isTypeOfNote(input)) return NotesModule.GraphQLNoteType;
    if (ImageModule.isTypeOfImage(input)) return ImageModule.GraphQLImageType;
    throw new Error("Invalid State.");
  },
});

type SharedResourceResourceResolveType = Promise<
  NotesModule.NoteModelType | ImageModule.ImageModelType
>;

const GraphQLSharedResourceChatMessageType =
  t.objectType<SharedResourceChatMessageType>({
    name: "SharedResourceChatMessage",
    interfaces: [GraphQLChatMessageInterfaceType],
    isTypeOf: (input) => input?.type === "SHARED_RESOURCE",
    fields: () => [
      t.field({ name: "id", type: t.NonNull(t.ID), resolve: (obj) => obj.id }),
      t.field({
        name: "authorName",
        type: t.NonNull(t.String),
        resolve: (obj) => obj.authorName,
      }),
      t.field({
        name: "resource",
        type: GraphQLSharedResourceEnumType,
        resolve: (
          input,
          args,
          context
        ): Promise<NotesModule.NoteModelType | ImageModule.ImageModelType> => {
          switch (input.resource.type) {
            case "NOTE": {
              return RT.run(
                NotesModule.resolveNote(input.resource.id),
                context
              ) as SharedResourceResourceResolveType;
            }
            case "IMAGE": {
              return RT.run(
                ImageModule.resolveImage(input.resource.id),
                context
              ) as SharedResourceResourceResolveType;
            }
          }
        },
      }),
    ],
  });

const GraphQLOperationalChatMessageType =
  t.objectType<OperationalChatMessageType>({
    interfaces: [
      GraphQLChatMessageInterfaceType,
      GraphQLTextChatMessageInterfaceType,
    ],
    name: "OperationalChatMessage",
    fields: () => [
      t.field({
        name: "id",
        type: t.NonNull(t.ID),
        resolve: (message) => message.id,
      }),
      t.field({
        name: "content",
        type: t.NonNull(t.String),
        resolve: (message) => message.content,
      }),
      t.field({
        name: "createdAt",
        type: t.NonNull(t.String),
        resolve: (message) => new Date(message.createdAt).toISOString(),
      }),
      t.field({
        name: "containsDiceRoll",
        type: t.NonNull(t.Boolean),
        resolve: () => false,
      }),
    ],
    isTypeOf: (src) => src?.type === "OPERATIONAL_MESSAGE",
  });

const GraphQLUserChatMessageType = t.objectType<UserChatMessageType>({
  interfaces: [
    GraphQLChatMessageInterfaceType,
    GraphQLTextChatMessageInterfaceType,
  ],
  name: "UserChatMessage",
  description: "A chat message",
  fields: () => [
    t.field({
      name: "id",
      type: t.NonNull(t.ID),
      resolve: (message) => message.id,
    }),
    t.field({
      name: "authorName",
      type: t.NonNull(t.String),
      resolve: (message) => message.authorName,
    }),
    t.field({
      name: "content",
      type: t.NonNull(t.String),
      resolve: (message) => message.content,
    }),
    t.field({
      name: "diceRolls",
      type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageDiceRoll))),
      resolve: (message) => message.diceRolls,
    }),
    t.field({
      name: "referencedDiceRolls",
      type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageDiceRoll))),
      resolve: (message) => message.referencedDiceRolls,
    }),
    t.field({
      name: "createdAt",
      type: t.NonNull(t.String),
      resolve: (message) => new Date(message.createdAt).toISOString(),
    }),
    t.field({
      name: "containsDiceRoll",
      type: t.NonNull(t.Boolean),
      resolve: (message) =>
        message.diceRolls.length > 0 || message.referencedDiceRolls.length > 0,
    }),
  ],
  isTypeOf: (src) => src?.type === "USER_MESSAGE",
});

const GraphQLChatMessageEdgeType = t.objectType<ChatMessageType>({
  name: "ChatMessageEdge",
  fields: () => [
    t.field({
      name: "cursor",
      type: t.NonNull(t.String),
      resolve: (input) => input.id,
    }),
    t.field({
      name: "node",
      type: t.NonNull(GraphQLChatMessageInterfaceType),
      resolve: (input) => input,
    }),
  ],
});

const GraphQLChatMessageConnectionType = t.objectType<Array<ChatMessageType>>({
  name: "ChatMessageConnection",
  fields: () => [
    t.field({
      name: "edges",
      type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageEdgeType))),
      resolve: (input) => input,
    }),
    t.field({
      name: "pageInfo",
      type: t.NonNull(GraphQLPageInfoType),
      resolve: () => ({}),
    }),
  ],
});

const GraphQLChatMessagesAddedSubscriptionType =
  t.objectType<NewMessagesPayload>({
    name: "ChatMessagesAddedSubscription",
    fields: () => [
      t.field({
        name: "messages",
        type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageInterfaceType))),
        resolve: (input) => input.messages,
      }),
    ],
  });

export const subscriptionFields = [
  t.subscriptionField({
    name: "chatMessagesAdded",
    type: t.NonNull(GraphQLChatMessagesAddedSubscriptionType),
    subscribe: (_, __, context) => context.chat.subscribe.newMessages(),
  }),
];

export const queryFields = [
  t.field({
    name: "chat",
    type: t.NonNull(GraphQLChatMessageConnectionType),
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.ID),
    },
    resolve: (_, __, ctx) => ctx.chat.getMessages(),
  }),
  t.field({
    name: "sharedSplashImage",
    type: ImageModule.GraphQLImageType,
    resolve: (_, __, context) => {
      const id = context.splashImageState.get();

      if (id === null) {
        return null;
      }

      return RT.run(ImageModule.resolveImage(id), context);
    },
  }),
];

const GraphQLChatMessageCreateInputType = t.inputObjectType({
  name: "ChatMessageCreateInput",
  fields: () => ({
    rawContent: {
      type: t.NonNullInput(t.String),
    },
    variables: {
      type: t.String,
    },
  }),
});

const GraphQLShareResourceInputType = t.inputObjectType({
  name: "ShareResourceInput",
  fields: () => ({
    contentId: {
      type: t.NonNullInput(t.ID),
    },
  }),
});

const GraphQLShareImageInputType = t.inputObjectType({
  name: "ShareImageInput",
  fields: () => ({
    imageId: {
      type: t.NonNullInput(t.ID),
    },
  }),
});

const GraphQLSplashShareImageInputType = t.inputObjectType({
  name: "SplashShareImageInput",
  fields: () => ({
    imageId: {
      type: t.ID,
    },
  }),
});

type ChatMessageCreateError = {
  type: "error";
  error: {
    reason: string;
  };
};

const GraphQLChatMessageCreateResultError =
  t.objectType<ChatMessageCreateError>({
    name: "ChatMessageCreateResultError",
    fields: () => [
      t.field({
        name: "reason",
        type: t.NonNull(t.String),
        resolve: (obj) => obj.error.reason,
      }),
    ],
  });

type ChatMessageCreateSuccess = { type: "success" };

const GraphQLChatMessageCreateResultSuccess =
  t.objectType<ChatMessageCreateSuccess>({
    name: "ChatMessageCreateResultSuccess",
    fields: () => [
      t.field({ name: "_", type: t.Boolean, resolve: () => true }),
    ],
  });

const GraphQLChatMessageCreateResultObjectType = t.objectType<
  ChatMessageCreateError | ChatMessageCreateSuccess
>({
  name: "ChatMessageCreateResult",
  fields: () => [
    t.field({
      name: "error",
      type: GraphQLChatMessageCreateResultError,
      resolve: (obj) => (obj.type === "error" ? obj : null),
    }),
    t.field({
      name: "success",
      type: GraphQLChatMessageCreateResultSuccess,
      resolve: (obj) => (obj.type === "success" ? obj : null),
    }),
  ],
});

export const mutationFields = [
  t.field({
    name: "chatMessageCreate",
    type: t.NonNull(GraphQLChatMessageCreateResultObjectType),
    args: {
      input: t.arg(t.NonNullInput(GraphQLChatMessageCreateInputType)),
    },
    resolve: (_, args, context) => {
      const user = context.user.get(context.session.id);
      if (!user) {
        return {
          type: "error" as const,
          error: {
            reason: "Not authenticated.",
          },
        };
      }
      const addMessageResult = context.chat.addUserMessage({
        authorName: user.name,
        rawContent: args.input.rawContent,
        variables: args.input.variables ? JSON.parse(args.input.variables) : {},
      });
      if (addMessageResult === null) {
        return {
          type: "success" as const,
        };
      }
      return {
        type: "error" as const,
        error: {
          reason: addMessageResult,
        },
      };
    },
  }),
  t.field({
    name: "shareResource",
    type: t.Boolean,
    args: {
      input: t.arg(t.NonNullInput(GraphQLShareResourceInputType)),
    },
    resolve: (_, args, context) => {
      const user = context.user.get(context.session.id);
      if (!user) return null;
      const decodedId = NotesModule.decodeNoteId(args.input.contentId);
      if (E.isLeft(decodedId)) return null;

      context.chat.addSharedResourceMessage({
        authorName: user.name,
        resource: {
          type: "NOTE",
          id: decodedId.right,
        },
      });
    },
  }),
  t.field({
    name: "shareImage",
    type: t.Boolean,
    args: {
      input: t.arg(t.NonNullInput(GraphQLShareImageInputType)),
    },
    resolve: (_, args, context) => {
      const user = context.user.get(context.session.id);
      if (!user) return null;

      context.chat.addSharedResourceMessage({
        authorName: user.name,
        resource: {
          type: "IMAGE",
          id: args.input.imageId,
        },
      });
    },
  }),
  t.field({
    name: "splashShareImage",
    type: t.Boolean,
    args: {
      input: t.arg(t.NonNullInput(GraphQLSplashShareImageInputType)),
    },
    resolve: (_, args, context) => {
      const user = context.user.get(context.session.id);
      if (!user || context.session.role !== "admin") {
        return null;
      }
      context.splashImageState.set(args.input.imageId);
      context.liveQueryStore.invalidate("Query.sharedSplashImage");

      return null;
    },
  }),
];

export const objectTypesNotDirectlyExposedOnFields = [
  GraphQLDiceRollOperatorNode,
  GraphQLDiceRollConstantNode,
  GraphQLDiceRollDiceRollNode,
  GraphQLDiceRollOpenParenNode,
  GraphQLDiceRollCloseParenNode,
  GraphQLUserChatMessageType,
  GraphQLOperationalChatMessageType,
  GraphQLSharedResourceChatMessageType,
];
