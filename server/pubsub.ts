import { makePushPullAsyncIterableIterator } from "@n1ru4l/push-pull-async-iterable-iterator";

type PubSubPublishArgsByKey = {
  [key: string]: [any] | [number | string, any];
};

export type ChannelPubSub<
  TPubSubPublishArgsByKey extends PubSubPublishArgsByKey
> = {
  publish<TKey extends Extract<keyof TPubSubPublishArgsByKey, string>>(
    routingKey: TKey,
    ...args: TPubSubPublishArgsByKey[TKey]
  ): void;
  subscribe<TKey extends Extract<keyof TPubSubPublishArgsByKey, string>>(
    ...[routingKey, id]: TPubSubPublishArgsByKey[TKey][1] extends undefined
      ? [TKey]
      : [TKey, TPubSubPublishArgsByKey[TKey][0]]
  ): AsyncGenerator<
    TPubSubPublishArgsByKey[TKey][1] extends undefined
      ? TPubSubPublishArgsByKey[TKey][0]
      : TPubSubPublishArgsByKey[TKey][1]
  >;
};

class PubSubEvent<T> extends Event {
  data: T;
  constructor(topic: string, data: T) {
    super(topic);
    this.data = data;
  }
}

export const createChannelPubSub = <
  TPubSubPublishArgsByKey extends PubSubPublishArgsByKey
>(): ChannelPubSub<TPubSubPublishArgsByKey> => {
  const target = new EventTarget();

  return {
    publish<TKey extends Extract<keyof TPubSubPublishArgsByKey, string>>(
      routingKey: TKey,
      ...args: TPubSubPublishArgsByKey[TKey]
    ) {
      if (args[1] !== undefined) {
        const event = new PubSubEvent(
          `${routingKey}:${args[0] as number}`,
          args[1]
        );
        target.dispatchEvent(event);
        return;
      }

      const event = new PubSubEvent(routingKey, args[0]);
      target.dispatchEvent(event);
    },
    subscribe<TKey extends Extract<keyof TPubSubPublishArgsByKey, string>>(
      ...[routingKey, id]: TPubSubPublishArgsByKey[TKey][1] extends undefined
        ? [TKey]
        : [TKey, TPubSubPublishArgsByKey[TKey][0]]
    ): AsyncGenerator<
      TPubSubPublishArgsByKey[TKey][1] extends undefined
        ? TPubSubPublishArgsByKey[TKey][0]
        : TPubSubPublishArgsByKey[TKey][1]
    > {
      const { pushValue, asyncIterableIterator } =
        makePushPullAsyncIterableIterator();

      const topic =
        id === undefined ? routingKey : `${routingKey}:${id as number}`;

      const handler = ((ev: PubSubEvent<unknown>) => {
        pushValue(ev.data);
      }) as unknown as EventListener;

      target.addEventListener(topic, handler);

      const originalReturn = asyncIterableIterator.return.bind(
        asyncIterableIterator
      );

      asyncIterableIterator.return = (...args) => {
        target.removeEventListener(topic, handler);
        return originalReturn(...args);
      };

      return asyncIterableIterator as any;
    },
  };
};
