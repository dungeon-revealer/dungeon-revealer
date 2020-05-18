import { t } from "../..";
import { GraphQLPageInfoType } from "../relay-spec";
import type {
  DiceRollDetail,
  ApplicationRecordSchema,
  ChatMessageNode,
} from "../../../chat";

type ChatMessageType = ApplicationRecordSchema;

const GraphQLChatMessageTextNode = t.objectType<
  Extract<ChatMessageNode, { type: "TEXT" }>
>({
  name: "ChatMessageTextNode",
  fields: () => [
    t.field("content", {
      type: t.NonNull(t.String),
      resolve: (node) => node.content,
    }),
  ],
});

type ChatMessageDiceRollNode = Extract<ChatMessageNode, { type: "DICE_ROLL" }>;

const GraphQLDiceRollOperatorNode = t.objectType<
  Extract<DiceRollDetail, { type: "Operator" }>
>({
  name: "DiceRollOperatorNode",
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
  fields: () => [
    t.field("content", {
      type: t.NonNull(t.String),
      resolve: (object) => object.content,
    }),
  ],
});

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

const GraphQLDiceRollDiceRollNode = t.objectType<
  Extract<DiceRollDetail, { type: "DiceRoll" }>
>({
  name: "DiceRollDiceRollNode",
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
  fields: () => [
    t.field("content", {
      type: t.NonNull(t.String),
      resolve: (object) => object.content,
    }),
  ],
});

// @TODO: Investigate whetehr we can simply use a interface type instead.
const GraphQLDiceRollDetailNode = t.unionType<DiceRollDetail>({
  name: "DiceRollDetail",
  types: [
    GraphQLDiceRollOperatorNode,
    GraphQLDiceRollConstantNode,
    GraphQLDiceRollDiceRollNode,
    GraphQLDiceRollOpenParenNode,
    GraphQLDiceRollCloseParenNode,
  ],
  resolveType: (obj) => {
    if (obj.type === "Operator") return GraphQLDiceRollOperatorNode;
    else if (obj.type === "Constant") return GraphQLDiceRollConstantNode;
    else if (obj.type === "DiceRoll") return GraphQLDiceRollDiceRollNode;
    else if (obj.type === "OpenParen") return GraphQLDiceRollOpenParenNode;
    else if (obj.type === "CloseParen") return GraphQLDiceRollCloseParenNode;
    throw new Error("Invalid type");
  },
});

const GraphQLChatMessageDiceRoll = t.objectType<
  ChatMessageDiceRollNode["content"]
>({
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

const GraphQLChatMessageDiceRollNode = t.objectType<ChatMessageDiceRollNode>({
  name: "ChatMessageDiceRollNode",
  fields: () => [
    t.field("content", {
      type: t.NonNull(GraphQLChatMessageDiceRoll),
      resolve: (input) => input.content,
    }),
  ],
});

const GraphQLChatMessageNode = t.unionType<ChatMessageType["content"][0]>({
  name: "ChatMessageNode",
  types: [GraphQLChatMessageDiceRollNode, GraphQLChatMessageTextNode],
  resolveType: (input) => {
    if (input.type === "TEXT") return GraphQLChatMessageTextNode;
    else if (input.type === "DICE_ROLL") return GraphQLChatMessageDiceRollNode;
    throw new Error("Invalid Case.");
  },
});

const GraphQLChatMessageType = t.objectType<ChatMessageType>({
  name: "ChatMessage",
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
      type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageNode))),
      resolve: (message) => message.content,
    }),
    t.field("createdAt", {
      type: t.NonNull(t.String),
      resolve: (message) => new Date(message.createdAt).toISOString(),
    }),
  ],
});

const GraphQLChatMessageEdgeType = t.objectType<ChatMessageType>({
  name: "ChatMessageEdge",
  fields: () => [
    t.field("cursor", {
      type: t.NonNull(t.String),
      resolve: (input) => input.id,
    }),
    t.field("node", {
      type: t.NonNull(GraphQLChatMessageType),
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
  messages: Array<ChatMessageType>;
}>({
  name: "ChatMessagesAddedSubscription",
  fields: () => [
    t.field("messages", {
      type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageType))),
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
      context.chat.addMessage({
        authorName: user.name,
        rawContent: args.input.rawContent,
      });
      return null;
    },
  }),
];
