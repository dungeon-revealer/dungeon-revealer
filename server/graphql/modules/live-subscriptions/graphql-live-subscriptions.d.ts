declare module "graphql-live-subscriptions/dist/subscribeToLiveData" {
  import { EventEmitter } from "events";
  import { GraphQLObjectType, GraphQLType } from "graphql";

  type ILiveSubscriptionTypeDefOptions = {
    type?: string;
    queryType?: string;
    subscriptionName?: string;
  };

  declare function liveSubscriptionTypeDef(
    options: ILiveSubscriptionTypeDefOptions
  ): GraphQLObjectType;

  type ISubscribeToLiveDataOptions<TRoot, TArgs, IContextType> = {
    fieldName: string;
    initialState: (source: TRoot, args: TArgs, context: IContextType) => any;
    eventEmitter: (
      source: TRoot,
      args: TArgs,
      context: IContextType
    ) => EventEmitter;
    sourceRoots: {
      [typeName: string]: string[];
    };
  };

  declare function subscribeToLiveData<TRoot, TArgs, IContextType>(
    options: ISubscribeToLiveDataOptions<TRoot, TArgs, IContextType>
  ): AsyncIterator;

  declare var GraphQLLiveData: (opts: {
    name: string;
    type: GraphQLType;
    resumption?: boolean;
  }) => GraphQLObjectType;
  export default subscribeToLiveData;
  export { liveSubscriptionTypeDef, GraphQLLiveData };
}
