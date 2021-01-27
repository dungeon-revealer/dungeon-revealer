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
