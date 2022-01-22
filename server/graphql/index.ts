import { createTypesFactory, buildGraphQLSchema } from "gqtx";
import type { Socket as IOSocket, Server as IOServer } from "socket.io";
import type { ChatPubSubConfig, createChat } from "../chat";
import type { createUser, UserPubSubConfig } from "../user";
import type { PubSub } from "@graphql-yoga/subscription";
import type { TokenImageUploadRegister } from "../token-image-lib";
import type { MapImageUploadRegister, MapPubSubConfig } from "../map-lib";
import type { NotesPubSubConfig } from "../notes-lib";

import type { SocketSessionRecord } from "../socket-session-store";
import type { Database } from "sqlite";
import type { InMemoryLiveQueryStore } from "@n1ru4l/in-memory-live-query-store";
import { GraphQLLiveDirective } from "@n1ru4l/graphql-live-query";
import type { SplashImageState } from "../splash-image-state";
import type { Maps } from "../maps";
import type { Settings } from "../settings";

export type PubSubConfig = MapPubSubConfig &
  UserPubSubConfig &
  NotesPubSubConfig &
  ChatPubSubConfig;

export type GraphQLContextType = {
  chat: ReturnType<typeof createChat>;
  user: ReturnType<typeof createUser>;
  db: Database;
  session: SocketSessionRecord;
  liveQueryStore: InMemoryLiveQueryStore;
  splashImageState: SplashImageState;
  socket: IOSocket;
  socketServer: IOServer;
  pubSub: PubSub<PubSubConfig>;
  publicUrl: string;
  tokenImageUploadRegister: TokenImageUploadRegister;
  mapImageUploadRegister: MapImageUploadRegister;
  fileStoragePath: string;
  maps: Maps;
  settings: Settings;
};

export const t = createTypesFactory<GraphQLContextType>();

import { specifiedDirectives } from "graphql";
import * as RelaySpecModule from "./modules/relay-spec";
import * as DiceRollerChatModule from "./modules/dice-roller-chat";
import * as UserModule from "./modules/user";
import * as NotesModule from "./modules/notes";
import * as TokenImageModule from "./modules/token-image";
import * as MapModule from "./modules/map";
import { pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import * as RT from "fp-ts/lib/ReaderTask";

const nodeField = t.field({
  name: "node",
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
                return NotesModule.resolveNote(id) as any;
              case TokenImageModule.TOKEN_IMAGE_URI:
                return TokenImageModule.resolveTokenImage(id) as any;
            }

            return RT.of(null);
          }
        )
      ),
      context
    ),
});

const Query = t.queryType({
  fields: () => [
    ...DiceRollerChatModule.queryFields,
    ...UserModule.queryFields,
    ...NotesModule.queryFields,
    ...TokenImageModule.queryFields,
    ...MapModule.queryFields,
    nodeField,
  ],
});

const Subscription = t.subscriptionType({
  fields: () => [
    ...UserModule.subscriptionFields,
    ...DiceRollerChatModule.subscriptionFields,
    ...NotesModule.subscriptionFields,
    ...TokenImageModule.subscriptionsFields,
    ...MapModule.subscriptionFields,
  ],
});

const Mutation = t.mutationType({
  fields: () => [
    ...UserModule.mutationFields,
    ...DiceRollerChatModule.mutationFields,
    ...NotesModule.mutationFields,
    ...TokenImageModule.mutationFields,
    ...MapModule.mutationFields,
  ],
});

export const schema = buildGraphQLSchema({
  query: Query,
  subscription: Subscription,
  mutation: Mutation,
  types: [...DiceRollerChatModule.objectTypesNotDirectlyExposedOnFields],
  directives: [...specifiedDirectives, GraphQLLiveDirective],
});
