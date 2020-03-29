"use strict";

const fs = require("fs");
const path = require("path");
const replaceStream = require("replacestream");

const main = async () => {
  const directory = path.join(__dirname, "..", "build", "static", "js");
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".js"))
    .map((fileName) => path.join(directory, fileName));

  for (const file of files) {
    const tmpFile = `${file}.tmp`;
    await new Promise((resolve, reject) => {
      const stream = fs
        .createReadStream(file)
        .pipe(
          replaceStream(
            '"__PUBLIC_URL_PLACEHOLDER__"',
            " window.__PUBLIC_URL__ "
          )
        )
        .pipe(
          replaceStream(
            '"__PUBLIC_URL_PLACEHOLDER__/"',
            ' window.__PUBLIC_URL__+"/"'
          )
        )
        .pipe(fs.createWriteStream(tmpFile));
      stream.on("finish", resolve);
      stream.on("error", reject);
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
