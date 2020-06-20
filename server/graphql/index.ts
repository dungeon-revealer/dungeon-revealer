import { createTypesFactory, buildGraphQLSchema } from "gqtx";
import type { createChat } from "../chat";
import type { createUser } from "../user";
import type { Database } from "sqlite";

export type GraphQLContextType = {
  chat: ReturnType<typeof createChat>;
  user: ReturnType<typeof createUser>;
  db: Database;
  getSessionId: () => string;
  setSessionId: (id: string) => void;
  viewerRole: "admin" | "user";
};

export type GraphQLSubscriptionRootType = {};

export const t = createTypesFactory<GraphQLContextType>();

import * as RelaySpecModule from "./modules/relay-spec";
import * as DiceRollerChatModule from "./modules/dice-roller-chat";
import * as UserModule from "./modules/user";
import * as NotesModule from "./modules/notes";
import { pipe } from "fp-ts/lib/pipeable";
import * as E from "fp-ts/lib/Either";
import * as RT from "fp-ts/lib/ReaderTask";

const nodeField = t.field("node", {
  type: RelaySpecModule.GraphQLNodeInterface,
  args: {
    id: t.arg(t.NonNullInput(t.ID)),
  },
  resolve: (_, args, context) =>
    RT.run(
      pipe(
        RelaySpecModule.decodeId(args.id),
        E.fold(
          () => RT.of(null),
          ([version, type, id]) => {
            if (version !== RelaySpecModule.API_VERSION) return RT.of(null);
            switch (type) {
              case NotesModule.NOTE_URI:
                return NotesModule.resolveNote(id);
            }

            return RT.of(null);
          }
        )
      ),
      context
    ),
});

const Query = t.queryType({
  fields: [
    ...DiceRollerChatModule.queryFields,
    ...UserModule.queryFields,
    ...NotesModule.queryFields,
    nodeField,
  ],
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
    ...NotesModule.mutationFields,
  ],
});

export const schema = buildGraphQLSchema({
  query: Query,
  subscription: Subscription,
  mutation: Mutation,
  types: [...DiceRollerChatModule.objectTypesNotDirectlyExposedOnFields],
});
