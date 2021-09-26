import { EventEmitter, on } from "events";

export const createPubSub = <TEventPayload = unknown>() => {
  const emitter = new EventEmitter();

  return {
    publish: (payload: TEventPayload) => void emitter.emit("value", payload),
    subscribe: async function* () {
      const asyncIterator = on(emitter, "value");
      for await (const [value] of asyncIterator) {
        yield value as TEventPayload;
      }
    },
  };
};

type PubSubPublishArgsByKey = {
  [key: string]: [any] | [number | string, any];
};

export const createChannelPubSub = <
  TPubSubPublishArgsByKey extends PubSubPublishArgsByKey
>() => {
  const emitter = new EventEmitter();

  return {
    publish: <TKey extends Extract<keyof TPubSubPublishArgsByKey, string>>(
      routingKey: TKey,
      ...args: TPubSubPublishArgsByKey[TKey]
    ) => {
      if (args[1] !== undefined) {
        emitter.emit(`${routingKey}:${args[0] as number}`, args[1]);
      }

      emitter.emit(routingKey, args[0]);
    },
    subscribe: async function* <
      TKey extends Extract<keyof TPubSubPublishArgsByKey, string>
    >(
      ...[routingKey, id]: TPubSubPublishArgsByKey[TKey][1] extends undefined
        ? [TKey]
        : [TKey, TPubSubPublishArgsByKey[TKey][0]]
    ): AsyncGenerator<
      TPubSubPublishArgsByKey[TKey][1] extends undefined
        ? TPubSubPublishArgsByKey[TKey][0]
        : TPubSubPublishArgsByKey[TKey][1]
    > {
      const asyncIterator = on(
        emitter,
        id === undefined ? routingKey : `${routingKey}:${id as number}`
      );
      for await (const [value] of asyncIterator) {
        yield value as any;
      }
    },
  };
};
