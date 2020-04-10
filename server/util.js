"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");
const uuid = require("uuid");
const once = require("lodash/once");

/**
 * Helper function for retreiving the correct data directory.
 * In the bundled pkg "binary" we use the execPath.
 */
const getDefaultDataDirectory = () => {
  if (process.pkg) {
    return path.resolve(path.dirname(process.execPath), "data");
  } else {
    // eslint-disable-next-line id-blacklist
    return path.resolve(__dirname, "..", "data");
  }
};

const getTmpDirectory = once(() => fs.realpathSync(os.tmpdir()));

const getTmpFile = (extension = "") =>
  path.join(getTmpDirectory(), uuid.v4() + extension);

const parseFileExtension = (fileName) => {
  const parts = fileName.split(".");
  if (parts.length < 2) return null;
  return parts.pop();
};

/**
 * utility that ensures tasks on a given resource are executed in sequence in order to prevent race conditions etc.
 */
const createResourceTaskProcessor = () => {
  const queueMap = new Map();
  return (operationIdentifier, process) => {
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

module.exports = {
  getDefaultDataDirectory,
  parseFileExtension,
  getTmpFile,
  createResourceTaskProcessor,
};
