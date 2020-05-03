import { t } from "../..";
import { liveSubscriptionField } from "../live-subscriptions";

type ChatMessageType = {
  id: string;
  rawContent: string;
  authorName: string;
  createdAt: number;
};

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
      type: t.NonNull(t.String),
      resolve: (message) => message.rawContent,
    }),
    t.field("createdAt", {
      type: t.NonNull(t.String),
      resolve: (message) => new Date(message.createdAt).toISOString(),
    }),
  ],
});

export const types = {
  GraphQLChatMessageType,
};

const ChatMessages = t.objectType<Array<ChatMessageType>>({
  name: "ChatMessageConnection",
  fields: () => [
    t.field("messages", {
      type: t.NonNull(t.List(t.NonNull(GraphQLChatMessageType))),
      resolve: (obj) => obj,
    }),
  ],
});

export const subscriptionFields = [
  liveSubscriptionField("chat", ChatMessages, {
    initialState: (obj, args, context) => context.chat.getMessages(),
    eventEmitter: (obj, args, context) => context.chat.emitter,
    sourceRoots: {},
  }),
];

export const queryFields = [
  t.field("chat", {
    type: t.NonNull(ChatMessages),
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
