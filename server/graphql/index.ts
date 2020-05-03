import { createTypesFactory, buildGraphQLSchema } from "gqtx";
import type { createChat } from "../chat";

export type GraphQLContextType = {
  chat: ReturnType<typeof createChat>;
};

export type GraphQLSubscriptionRootType = {};

export const t = createTypesFactory<GraphQLContextType>();

import * as DiceRollerChatModule from "./modules/dice-roller-chat";

const Query = t.queryType({
  fields: [...DiceRollerChatModule.queryFields],
});

const Subscription = t.subscriptionType({
  fields: [...DiceRollerChatModule.subscriptionFields],
});

const Mutation = t.mutationType({
  fields: () => [...DiceRollerChatModule.mutationFields],
});

export const schema = buildGraphQLSchema({
  query: Query,
  subscription: Subscription,
  mutation: Mutation,
});
