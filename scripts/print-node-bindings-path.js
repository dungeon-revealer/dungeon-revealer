"use strict";

const path = require("path");
const binary = require("node-pre-gyp");

const bindingPath = binary.find(
  path.resolve(
    path.join(path.dirname(require.resolve("sqlite3")), "../package.json")
  )
);

console.log(bindingPath);
