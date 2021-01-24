import { createTypesFactory, buildGraphQLSchema } from "gqtx";
import type { Socket as IOSocket } from "socket.io";
import type { createChat } from "../chat";
import type { createUser } from "../user";
import type { NotesUpdates } from "../notes-lib";

import type { SocketSessionRecord } from "../socket-session-store";
import type { Database } from "sqlite";
import type { InMemoryLiveQueryStore } from "@n1ru4l/in-memory-live-query-store";
import { GraphQLLiveDirective } from "@n1ru4l/graphql-live-query";
import type { SplashImageState } from "../splash-image-state";

export type GraphQLContextType = {
  chat: ReturnType<typeof createChat>;
  user: ReturnType<typeof createUser>;
  db: Database;
  session: SocketSessionRecord;
  liveQueryStore: InMemoryLiveQueryStore;
  splashImageState: SplashImageState;
  socket: IOSocket;
  notesUpdates: NotesUpdates;
};

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
    ...NotesModule.subscriptionFields,
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
  directives: [GraphQLLiveDirective],
});
