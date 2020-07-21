"use strict";

const fromEntries = require("fromentries");

// TODO: REMOVE THIS ASAP WHEN THE BINARIES ARE BUILT WITH NODE 12
if (!Object.fromEntries) {
  Object.fromEntries = fromEntries;
}
