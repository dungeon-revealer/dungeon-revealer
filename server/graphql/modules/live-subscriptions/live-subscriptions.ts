import { t, GraphQLContextType } from "../..";
import { EventEmitter } from "events";
import * as JSONModule from "../json";
import subscribeToLiveData from "graphql-live-subscriptions/dist/subscribeToLiveData";
import { ObjectType, TOfArgMap, ArgMap, ListType } from "gqtx/dist/types";
import { GraphQLResolveInfo } from "graphql";

export type IRFC6902OperationType = {
  op: string;
  path: string;
  from: string | null;
  value: JSON;
};

const GraphQLRFC6902OperationType = t.objectType<IRFC6902OperationType>({
  name: "RFC6902Operation",
  fields: () => [
    t.defaultField("op", t.NonNull(t.String)),
    t.defaultField("path", t.NonNull(t.String)),
    t.defaultField("from", t.String),
    t.defaultField("value", JSONModule.graphqlScalars.JSON),
  ],
});

export type LiveSubscriptionType<T = any> = {
  query: T;
  patch: IRFC6902OperationType[] | null;
};

const createLiveSubscriptionType = <
  Src,
  TType extends ObjectType<GraphQLContextType, Src>
>(
  type: TType
) =>
  t.objectType<LiveSubscriptionType<Src>, GraphQLContextType>({
    name: `${type.name}LiveSubscription`,
    fields: () => [
      t.field("query", {
        type,
        resolve: ({ query }) => query,
      }),
      t.field("patch", {
        type: t.List(GraphQLRFC6902OperationType),
        resolve: ({ patch }) => patch,
      }),
    ],
  });

export const liveSubscriptionField = <
  Src,
  Args,
  TName extends string,
  TObjectType extends ObjectType<GraphQLContextType, any>,
  TObjectOutType = TObjectType extends ObjectType<any, infer A> ? A : never
>(
  name: TName,
  type: TObjectType,
  subscriptionOptions: {
    initialState: (
      source: Src,
      args: Args,
      context: GraphQLContextType
    ) => TObjectOutType;
    eventEmitter: (
      source: Src,
      args: Args,
      context: GraphQLContextType
    ) => EventEmitter;
    sourceRoots: {
      [typeName: string]: string[];
    };
  }
) =>
  t.subscriptionField<Src, any, any>(name, {
    type: createLiveSubscriptionType(type),
    subscribe: subscribeToLiveData<Src, Args, GraphQLContextType>({
      fieldName: name,
      ...subscriptionOptions,
    }),
    resolve: (obj, args, ctx) => obj,
  });
