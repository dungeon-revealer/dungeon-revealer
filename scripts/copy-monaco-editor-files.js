"use strict";

const path = require("path");
const fs = require("fs-extra");

const pkgRoot = path.resolve(__dirname, "..", "node_modules", "monaco-editor");

const version = fs.readJSONSync(path.join(pkgRoot, "package.json")).version;

const monacoFiles = [
  "vs/editor/editor.main.js",
  "vs/editor/editor.main.nls.js",
  "vs/editor/editor.main.css",
  "vs/editor/editor.main.js",
  "vs/basic-languages/markdown/markdown.js",
  "vs/basic-languages/css/css.js",
  "vs/loader.js",
  "vs/base/worker/workerMain.js",
  "vs/base/browser/ui/codicons/codicon/codicon.ttf",
].map((file) => path.join(...file.split("/")));

const publicPath = path.join(
  __dirname,
  "..",
  "public",
  "monaco-editor",
  version
);

for (const file of monacoFiles) {
  const fullPath = path.join(pkgRoot, "min", file);
  const fileDestination = path.join(publicPath, file);
  fs.mkdirpSync(path.dirname(fileDestination));
  fs.copyFileSync(fullPath, fileDestination);
}
