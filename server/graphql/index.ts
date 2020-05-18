import { createTypesFactory, buildGraphQLSchema } from "gqtx";
import type { createChat } from "../chat";
import type { createUser } from "../user";

export type GraphQLContextType = {
  chat: ReturnType<typeof createChat>;
  user: ReturnType<typeof createUser>;
  getSessionId: () => string;
  setSessionId: (id: string) => void;
};

export type GraphQLSubscriptionRootType = {};

export const t = createTypesFactory<GraphQLContextType>();

import * as DiceRollerChatModule from "./modules/dice-roller-chat";
import * as UserModule from "./modules/user";

const Query = t.queryType({
  fields: [...DiceRollerChatModule.queryFields, ...UserModule.queryFields],
});

const Subscription = t.subscriptionType({
  fields: [
    ...UserModule.subscriptionFields,
    ...DiceRollerChatModule.subscriptionFields,
  ],
});

const Mutation = t.mutationType({
  fields: () => [
    ...UserModule.mutationFields,
    ...DiceRollerChatModule.mutationFields,
  ],
});

export const schema = buildGraphQLSchema({
  query: Query,
  subscription: Subscription,
  mutation: Mutation,
});
