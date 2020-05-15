import { t } from "../..";
import type { ChatMessageNode, ApplicationRecordSchema } from "../../../chat";

type ChatMessageType = ApplicationRecordSchema;

const GraphQLChatMessageTextNode = t.objectType<
  Extract<ChatMessageNode, { type: "TEXT" }>
>({
  name: "ChatMessageTextNode",
  fields: () => [
    t.field("textContent", {
      type: t.NonNull(t.String),
      resolve: (node) => node.content,
    }),
  ],
});

type ChatMessageDiceRollNode = Extract<ChatMessageNode, { type: "DICE_ROLL" }>;

const GraphQLChatMessageInvalidDiceRoll = t.objectType<
  Extract<ChatMessageDiceRollNode["content"], { type: "ERROR" }>
>({
  name: "InvalidDiceRoll",
  fields: () => [
    t.field("content", {
      type: t.NonNull(t.String),
      resolve: (input) => input.notation,
    }),
  ],
});

const GraphQLChatMessageDiceRoll = t.objectType<
  Extract<ChatMessageDiceRollNode["content"], { type: "SUCCESS" }>
>({
  name: "DiceRoll",
  fields: () => [
    t.field("result", {
      type: t.NonNull(t.Int),
      resolve: (input) => input.result.result,
    }),
  ],
});

const GraphQLDiceRollResult = t.unionType<ChatMessageDiceRollNode["content"]>({
  name: "DiceRollResult",
  types: [GraphQLChatMessageInvalidDiceRoll, GraphQLChatMessageDiceRoll],
  resolveType: (input) => {
    if (input.type === "SUCCESS") return GraphQLChatMessageDiceRoll;
    return GraphQLChatMessageInvalidDiceRoll;
  },
});

const GraphQLChatMessageDiceRollNode = t.objectType<ChatMessageDiceRollNode>({
  name: "ChatMessageDiceRollNode",
  fields: () => [
    t.field("content", {
      type: t.NonNull(GraphQLDiceRollResult),
      resolve: (input) => input.content,
    }),
  ],
});

const GraphQLChatMessageNode = t.unionType<ChatMessageType["rawContent"][0]>({
  name: "ChatMessageNode",
  types: [GraphQLChatMessageDiceRollNode, GraphQLChatMessageTextNode],
  resolveType: (input) => {
    if (input.type === "TEXT") return GraphQLChatMessageTextNode;
    else return GraphQLChatMessageDiceRollNode;
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
    t.field("rawContent", {
      type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageNode))),
      resolve: (message) => message.rawContent,
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

const GraphQLPageInfoType = t.objectType<{}>({
  name: "PageInfo",
  fields: () => [
    t.field("hasNextPage", {
      type: t.NonNull(t.Boolean),
      resolve: () => false,
    }),
    t.field("hasPreviousPage", {
      type: t.NonNull(t.Boolean),
      resolve: () => false,
    }),
    t.field("startCursor", {
      type: t.NonNull(t.String),
      resolve: () => "",
    }),
    t.field("endCursor", {
      type: t.NonNull(t.String),
      resolve: () => "",
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

export const types = {
  GraphQLChatMessageType,
};

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
    authorName: {
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
      context.chat.addMessage({
        authorName: args.input.authorName,
        rawContent: args.input.rawContent,
      });
      return null;
    },
  }),
];
