import { t } from "../..";
import { GraphQLPageInfoType } from "../relay-spec";
import type {
  DiceRollDetail,
  ApplicationRecordSchema,
  DiceRollResult,
} from "../../../chat";

type ChatMessageType = ApplicationRecordSchema;
type UserChatMessageType = Extract<ChatMessageType, { type: "USER_MESSAGE" }>;
type OperationalChatMessageType = Extract<
  ChatMessageType,
  { type: "OPERATIONAL_MESSAGE" }
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
}>({
  name: "DiceRollResult",
  fields: () => [
    t.field("dice", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.dice,
    }),
    t.field("result", {
      type: t.NonNull(t.Float),
      resolve: (obj) => obj.result,
    }),
    t.field("category", {
      type: t.NonNull(GraphQLDiceRollCategory),
      resolve: (obj) => obj.category,
    }),
  ],
});

const GraphQLDiceRollDetailNode = t.interfaceType<DiceRollDetail>({
  name: "DiceRollDetail",
  fields: () => [t.abstractField("content", t.NonNull(t.String))],
});

const GraphQLDiceRollOperatorNode = t.objectType<
  Extract<DiceRollDetail, { type: "Operator" }>
>({
  name: "DiceRollOperatorNode",
  interfaces: [GraphQLDiceRollDetailNode],
  isTypeOf: (src) => src?.type === "Operator",
  fields: () => [
    t.field("content", {
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
    t.field("content", {
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
    t.field("content", {
      type: t.NonNull(t.String),
      resolve: (object) => object.content,
    }),
    t.field("min", {
      type: t.NonNull(t.Float),
      resolve: (object) => object.detail.min,
    }),
    t.field("max", {
      type: t.NonNull(t.Float),
      resolve: (object) => object.detail.max,
    }),
    t.field("rollResults", {
      type: t.NonNull(t.List(t.NonNull(GraphQLDiceRollResult))),
      resolve: (object) =>
        object.rolls.map((result) => ({
          dice: object.content.substring(1),
          result,
          category:
            result === object.detail.min
              ? DiceRollType.MIN
              : result === object.detail.max
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
    t.field("content", {
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
    t.field("content", {
      type: t.NonNull(t.String),
      resolve: (object) => object.content,
    }),
  ],
});

const GraphQLChatMessageDiceRoll = t.objectType<DiceRollResult>({
  name: "DiceRoll",
  fields: () => [
    t.field("result", {
      type: t.NonNull(t.Float),
      resolve: (input) => input.result,
    }),
    t.field("detail", {
      type: t.NonNull(t.List(t.NonNull(GraphQLDiceRollDetailNode))),
      resolve: (input) => input.detail,
    }),
  ],
});

const GraphQLChatMessageInterfaceType = t.interfaceType<ChatMessageType>({
  name: "ChatMessage",
  fields: () => [
    t.abstractField("id", t.NonNull(t.ID)),
    t.abstractField("content", t.NonNull(t.String)),
    t.abstractField("createdAt", t.NonNull(t.String)),
    t.abstractField("containsDiceRoll", t.NonNull(t.Boolean)),
  ],
});

const GraphQLOperationalChatMessageType = t.objectType<
  OperationalChatMessageType
>({
  interfaces: [GraphQLChatMessageInterfaceType],
  name: "OperationalChatMessage",
  fields: () => [
    t.field("id", {
      type: t.NonNull(t.ID),
      resolve: (message) => message.id,
    }),
    t.field("content", {
      type: t.NonNull(t.String),
      resolve: (message) => message.content,
    }),
    t.field("createdAt", {
      type: t.NonNull(t.String),
      resolve: (message) => new Date(message.createdAt).toISOString(),
    }),
    t.field("containsDiceRoll", {
      type: t.NonNull(t.Boolean),
      resolve: () => false,
    }),
  ],
  isTypeOf: (src) => src?.type === "OPERATIONAL_MESSAGE",
});

const GraphQLUserChatMessageType = t.objectType<UserChatMessageType>({
  interfaces: [GraphQLChatMessageInterfaceType],
  name: "UserChatMessage",
  description: "A chat message",
  fields: () => [
    t.field("id", {
      type: t.NonNull(t.ID),
      resolve: (message) => message.id,
    }),
    t.field("authorName", {
      type: t.NonNull(t.String),
      resolve: (message) => message.authorName,
    }),
    t.field("content", {
      type: t.NonNull(t.String),
      resolve: (message) => message.content,
    }),
    t.field("diceRolls", {
      type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageDiceRoll))),
      resolve: (message) => message.diceRolls,
    }),
    t.field("createdAt", {
      type: t.NonNull(t.String),
      resolve: (message) => new Date(message.createdAt).toISOString(),
    }),
    t.field("containsDiceRoll", {
      type: t.NonNull(t.Boolean),
      resolve: (message) => message.diceRolls.length > 0,
    }),
  ],
  isTypeOf: (src) => src?.type === "USER_MESSAGE",
});

const GraphQLChatMessageEdgeType = t.objectType<ChatMessageType>({
  name: "ChatMessageEdge",
  fields: () => [
    t.field("cursor", {
      type: t.NonNull(t.String),
      resolve: (input) => input.id,
    }),
    t.field("node", {
      type: t.NonNull(GraphQLChatMessageInterfaceType),
      resolve: (input) => input,
    }),
  ],
});

const GraphQLChatMessageConnectionType = t.objectType<Array<ChatMessageType>>({
  name: "ChatMessageConnection",
  fields: () => [
    t.field("edges", {
      type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageEdgeType))),
      resolve: (input) => input,
    }),
    t.field("pageInfo", {
      type: t.NonNull(GraphQLPageInfoType),
      resolve: () => ({}),
    }),
  ],
});

const GraphQLChatMessagesAddedSubscriptionType = t.objectType<{
  messages: Array<UserChatMessageType>;
}>({
  name: "ChatMessagesAddedSubscription",
  fields: () => [
    t.field("messages", {
      type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageInterfaceType))),
      resolve: (input) => input.messages,
    }),
  ],
});

export const subscriptionFields = [
  t.subscriptionField("chatMessagesAdded", {
    type: t.NonNull(GraphQLChatMessagesAddedSubscriptionType),
    resolve: (obj) => obj as any,
    subscribe: (obj, args, context) => context.chat.subscribe.newMessages(),
  }),
];

export const queryFields = [
  t.field("chat", {
    type: t.NonNull(GraphQLChatMessageConnectionType),
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.ID),
    },
    resolve: (_, args, ctx) => ctx.chat.getMessages(),
  }),
];

const GraphQLChatMessageCreateInputType = t.inputObjectType({
  name: "ChatMessageCreateInput",
  fields: () => ({
    rawContent: {
      type: t.NonNullInput(t.String),
    },
  }),
});

export const mutationFields = [
  t.field("chatMessageCreate", {
    type: t.Boolean,
    args: {
      input: t.arg(t.NonNullInput(GraphQLChatMessageCreateInputType)),
    },
    resolve: (obj, args, context) => {
      const user = context.user.get(context.getSessionId());
      if (!user) return null;
      context.chat.addUserMessage({
        authorName: user.name,
        rawContent: args.input.rawContent,
      });
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
];
