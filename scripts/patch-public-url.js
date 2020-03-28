"use strict";

const fs = require("fs");
const path = require("path");
const replaceStream = require("replacestream");

const directory = path.join(__dirname, "..", "build", "static", "js");

const files = fs
  .readdirSync(directory)
  .filter((file) => file.endsWith(".js"))
  .map((fileName) => path.join(directory, fileName));

const main = async () => {
  for (const file of files) {
    const tmpFile = `${file}.tmp`;
    await new Promise((resolve) => {
      fs.createReadStream(file)
        .pipe(
          replaceStream('"__BASE_URL_PLACEHOLDER__"', "window.__BASE_URL__")
        )
        .pipe(fs.createWriteStream(tmpFile))
        .on("finish", resolve);
    });
    fs.unlinkSync(file);
    fs.copyFileSync(tmpFile, file);
    fs.unlinkSync(tmpFile);
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
