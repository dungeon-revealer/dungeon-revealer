"use strict";

const path = require("path");
const fs = require("fs-extra");
const uuid = require("uuid/v4");

class ImageStorage {
  constructor({ dataDirectory }) {
    this._mapsDirectoryPath = path.join(dataDirectory, "images");
    fs.mkdirpSync(this._mapsDirectoryPath);
  }

  async store({ filePath, fileExtension }) {
    const id = uuid();
    const fileName = `${id}.${fileExtension}`;
    await fs.move(filePath, path.join(this._mapsDirectoryPath, fileName));
    return { fileName };
  }

  resolvePath(fileName) {
    return path.resolve(this._mapsDirectoryPath, fileName);
  }
}

module.exports = { ImageStorage };
