"use strict";
const path = require("path");

const PUBLIC_PATH = path.resolve(__dirname, "..", "build");
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const PC_PASSWORD = process.env.PC_PASSWORD || null;
const DM_PASSWORD = process.env.DM_PASSWORD || null;

module.exports = {
  PUBLIC_PATH,
  PUBLIC_URL,
  PORT,
  HOST,
  PC_PASSWORD,
  DM_PASSWORD,
};
