"use strict";

const path = require("path");

/**
 * Helper function for retreiving the correct data directory.
 * In the bundled pkg "binary" we use the execPath.
 */
const getDataDirectory = () => {
  if (process.pkg) {
    return path.resolve(path.dirname(process.execPath), "data");
  } else {
    // eslint-disable-next-line id-blacklist
    return path.resolve(__dirname, "..", "data");
  }
};

module.exports = {
  getDataDirectory
};
