"use strict";

const fse = require("fs-extra");
const path = require("path");
const pkg = require("../package.json");
const { spawnSync } = require("child_process");

const version = {
  appVersion: pkg.version,
  status: "unknown",
  tag: "",
  commit: "",
  commitsAhead: 0,
  obj: "",
};

const exec = spawnSync("git", ["describe", "--tags"]);

if (exec.status !== 0) {
  version.status = "unknown";
} else {
  const gitDesc = exec.stdout.toString().replace("\n", "");
  const gdArray = gitDesc.split("-");
  version.tag = gdArray[0];
  if (gitDesc.slice(1) === version.appVersion) {
    version.status = "release";
  } else {
    version.status = "development";
    version.commit = spawnSync("git", ["rev-parse", "--short", "HEAD"])
      .stdout.toString()
      .replace("\n", "");
    version.commitsAhead = gdArray[1];
    version.obj = gdArray[2];
  }
}

const monacoVersion =
  require("../node_modules/monaco-editor/package.json").version;

let tsOut = "";
for (const entry of Object.entries(version)) {
  tsOut += `export const ${entry[0]}: string = '${entry[1]}';\n`;
}

fse.outputFileSync(path.join("server", "version.ts"), tsOut);
fse.outputFileSync(path.join(".env"), `VITE_MONACO_VERSION=${monacoVersion}`);
