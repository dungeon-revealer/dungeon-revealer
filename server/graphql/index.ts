import { createTypesFactory, buildGraphQLSchema } from "gqtx";
import type { createChat } from "../chat";
import type { createUser } from "../user";
import type { SocketSessionRecord } from "../socket-session-store";
import type { Database } from "sqlite";
import type { LiveQueryStore } from "@n1ru4l/graphql-live-query";
import type { SplashImageState } from "../splash-image-state";
import type { ActiveMapStore } from "../maps-lib";
import type { ResourceTaskProcessor } from "../util";

export type GraphQLContextType = {
  chat: ReturnType<typeof createChat>;
  user: ReturnType<typeof createUser>;
  db: Database;
  session: SocketSessionRecord;
  liveQueryStore: LiveQueryStore;
  splashImageState: SplashImageState;
  activeMapStore: ActiveMapStore;
  resourceTaskProcessor: ResourceTaskProcessor;
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

type ReaderDependencyType<T> = T extends RT.ReaderTask<infer Deps, any>
  ? Deps
  : never;

// for making the TypeScript compiler happy we have to cast all possible return types
// if you know a better way let me know :)
// prettier-ignore
type ReaderTaskType =
  ReaderDependencyType<ReturnType<typeof NotesModule.resolveNote>>
  & ReaderDependencyType<ReturnType<typeof MapModule.resolveMapByDatabaseId>>
;

type NodeReaderTaskType = RT.ReaderTask<ReaderTaskType, { id: string }>;

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
          (_err) => {
            // TODO: better error handling
            // the best thing would be to have a "resolver" abstraction that takes either
            // - Either<unknown, Error | Errors>
            // - TaskEither<unknown, Error | Errors>
            // - ReaderTaskEither<unknown, Error | Errors>
            // Pretty prints those errors to the console and then returns null/throws or throws an "Unexpected Server" error,
            // so the error is not propagated to the outside world
            throw new Error("Invalid id provided.");
          },
          ([version, type, id]) => {
            if (version !== RelaySpecModule.API_VERSION) {
              return RT.of(null);
            }

            switch (type) {
              case NotesModule.NOTE_URI:
                return NotesModule.resolveNote(id) as NodeReaderTaskType;
              case MapModule.MAP_URI:
                return MapModule.resolveMapByDatabaseId({
                  id,
                }) as NodeReaderTaskType;
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
