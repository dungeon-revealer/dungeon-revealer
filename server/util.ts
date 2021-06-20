import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { randomUUID } from "crypto";
import once from "lodash/once";
import * as express from "express";

/**
 * Helper function for retrieving the correct data directory.
 * In the bundled pkg "binary" we use the execPath.
 */
export const getDefaultDataDirectory = () => {
  const isCaxa = process.argv.includes("--caxa");
  if (isCaxa) {
    return path.resolve(process.cwd(), "data");
  } else {
    // eslint-disable-next-line id-blacklist
    return path.resolve(__dirname, "..", "data");
  }
};

export const getTmpDirectory = once(() => fs.realpathSync(os.tmpdir()));

export const getTmpFile = (extension = "") =>
  path.join(getTmpDirectory(), randomUUID() + extension);

export const parseFileExtension = (fileName: string) => {
  const parts = fileName.split(".");
  if (parts.length < 2) return null;
  return parts.pop() || null;
};

/**
 * utility that ensures tasks on a given resource are executed in sequence in order to prevent race conditions etc.
 */
export const createResourceTaskProcessor = () => {
  const queueMap = new Map();
  return (operationIdentifier: string, process: () => unknown) => {
    const queue = (queueMap.get(operationIdentifier) || Promise.resolve())
      .catch(() => undefined)
      .then(process);
    queueMap.set(operationIdentifier, queue);

    // delete inactive queues if no futher task has been added
    queue.finally(() =>
      setTimeout(() => {
        if (queueMap.get(operationIdentifier) === queue) {
          queueMap.delete(operationIdentifier);
        }
      }, 500).unref()
    );

    return queue;
  };
};

export const handleUnexpectedError =
  (response: express.Response) => (thrownThing: any) => {
    console.error(thrownThing);
    response.status(500).send({
      data: null,
      error: {
        message: "An unexpected error occured.",
        code: "ERR_UNEXPECTED",
      },
    });
  };
