import { createTypesFactory, buildGraphQLSchema } from "gqtx";
import type { createChat } from "../chat";
import type { createUser } from "../user";
import type { SocketSessionRecord } from "../socket-session-store";
import type { Database } from "sqlite";
import type { LiveQueryStore } from "@n1ru4l/graphql-live-query";
import type { SplashImageState } from "../splash-image-state";
import type { ActiveMapStore } from "../maps-lib";

export type GraphQLContextType = {
  chat: ReturnType<typeof createChat>;
  user: ReturnType<typeof createUser>;
  db: Database;
  session: SocketSessionRecord;
  liveQueryStore: LiveQueryStore;
  splashImageState: SplashImageState;
  activeMapStore: ActiveMapStore;
};

export const t = createTypesFactory<GraphQLContextType>();

import * as RelaySpecModule from "./modules/relay-spec";
import * as DiceRollerChatModule from "./modules/dice-roller-chat";
import * as UserModule from "./modules/user";
import * as NotesModule from "./modules/notes";
import * as MapModule from "./modules/maps";

import { pipe } from "fp-ts/lib/pipeable";
import * as E from "fp-ts/lib/Either";
import * as RT from "fp-ts/lib/ReaderTask";
import { GraphQLLiveDirective } from "@n1ru4l/graphql-live-query";
import { Interface } from "gqtx/dist/types";

const nodeField = t.field("node", {
  type: RelaySpecModule.GraphQLNodeInterface as Interface<
    GraphQLContextType,
    any
  >,
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
            if (version !== RelaySpecModule.API_VERSION) {
              return RT.of(null);
            }
            // We have to cast to any here otherwise the TypeScript compiler complains :(
            // If you are digging the code and know better please fix it :)
            switch (type) {
              case NotesModule.NOTE_URI:
                return NotesModule.resolveNote(id) as any;
              case MapModule.MAP_URI:
                return MapModule.resolveMapByDatabaseId({ id }) as any;
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
    ...MapModule.queryFields,
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
    ...MapModule.mutationFields,
  ],
});

export const schema = buildGraphQLSchema({
  query: Query,
  subscription: Subscription,
  mutation: Mutation,
  types: [...DiceRollerChatModule.objectTypesNotDirectlyExposedOnFields],
  directives: [GraphQLLiveDirective],
});
