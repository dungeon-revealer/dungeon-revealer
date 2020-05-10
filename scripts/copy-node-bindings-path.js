"use strict";

const path = require("path");
const fs = require("fs");
const binary = require("node-pre-gyp");

const bindingPath = binary.find(
  path.resolve(
    path.join(path.dirname(require.resolve("sqlite3")), "../package.json")
  )
);

const targetDirectory = path.resolve(__dirname, "..");

fs.copyFileSync(
  bindingPath,
  path.join(targetDirectory, path.basename(bindingPath))
);
fs.unlinkSync(bindingPath);
