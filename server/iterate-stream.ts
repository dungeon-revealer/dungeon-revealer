import type { Duplex } from "stream";
import type { EventEmitter } from "events";
import once from "lodash/once";

export async function* iterateStream<T = unknown>(stream: Duplex) {
  const contents: T[] = [];
  stream.on("data", (data) => contents.push(data));

  let resolveStreamEndedPromise: () => void = () => undefined;
  const streamEndedPromise = new Promise((resolve) => {
    resolveStreamEndedPromise = once(resolve) as () => void;
  });

  let hasEnded = false;
  stream.on("end", () => {
    hasEnded = true;
    resolveStreamEndedPromise();
  });

  let error: boolean | Error = false;
  stream.on("error", (err) => {
    error = err;
    resolveStreamEndedPromise();
  });

  while (!hasEnded || contents.length > 0) {
    if (contents.length === 0) {
      stream.resume();
      const waitForEmit = waitOnceEmitted(stream, "data");
      await Promise.race([waitForEmit.done, streamEndedPromise]);
      waitForEmit.cleanup();
    } else {
      stream.pause();
      const data = contents.shift();
      if (data) {
        yield data;
      }
    }
    if (error) {
      throw error;
    }
  }
  resolveStreamEndedPromise();
}

const waitOnceEmitted = (eventEmitter: EventEmitter, type: string) => {
  let destroy: () => void = () => undefined;
  return {
    done: new Promise<void>((resolve) => {
      const resolvePromise = once(resolve);
      destroy = () => {
        resolve();
        eventEmitter.off(type, resolvePromise);
      };
      eventEmitter.on(type, resolvePromise);
    }),
    cleanup: () => destroy(),
  };
};
