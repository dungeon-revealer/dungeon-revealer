"use strict";

const path = require("path");
const fs = require("fs-extra");
const junk = require("junk");
const uuid = require("uuid/v4");
const { getDataDirectory } = require("./util");

const mapDirectory = path.join(getDataDirectory(), "maps");
const isDirectory = source => fs.lstatSync(source).isDirectory();

class Maps {
  constructor() {
    fs.mkdirpSync(mapDirectory);
    this.maps = this._loadMaps();
  }

  _loadMaps() {
    const mapDirectories = fs
      .readdirSync(path.join(mapDirectory))
      .filter(junk.not)
      .map(id => path.join(mapDirectory, id))
      .filter(isDirectory);

    return mapDirectories.map(directory => {
      const rawConfig = fs.readFileSync(
        path.join(directory, "settings.json"),
        "utf-8"
      );
      return JSON.parse(rawConfig);
    });
  }

  getAll() {
    return this.maps;
  }

  get(id) {
    return this.maps.find(map => map.id === id) || null;
  }

  createMap({ title, file }) {
    const id = uuid();
    fs.mkdirSync(path.join(mapDirectory, id));
    const mapPath = `map.${file.extension}`;
    const map = {
      id,
      title,
      // automatically saved after interaction
      fogProgressPath: null,
      // progress becomes live when DM publishes map
      fogLivePath: null,
      mapPath,
      grid: null
    };

    fs.moveSync(file.path, path.join(mapDirectory, id, mapPath));

    fs.writeFileSync(
      path.join(mapDirectory, id, "settings.json"),
      JSON.stringify(map, undefined, 2)
    );

    this.maps.push(map);

    return map;
  }

  updateMapSettings(id, data) {
    const map = this.maps.find(map => map.id === id);
    if (!map) {
      throw new Error(`Map with id "${id}" not found.`);
    }

    Object.assign(map, data);

    fs.writeFileSync(
      path.join(mapDirectory, id, "settings.json"),
      JSON.stringify(map, undefined, 2)
    );

    return map;
  }

  async updateFogProgressImage(id, imageData) {
    const map = this.maps.find(map => map.id === id);
    if (!map) {
      throw new Error(`Map with id "${id}" not found.`);
    }
    if (map.fogProgressPath) {
      fs.removeSync(path.join(mapDirectory, id, map.fogProgressPath));
    }

    const newMapData = {
      fogProgressPath: "fog.progress.png"
    };

    fs.writeFileSync(
      path.join(mapDirectory, id, newMapData.fogProgressPath),
      imageData,
      "base64"
    );

    await this.updateMapSettings(id, newMapData);

    return map;
  }

  async updateFogLiveImage(id, imageData) {
    const map = this.maps.find(map => map.id === id);
    if (!map) {
      throw new Error(`Map with id "${id}" not found.`);
    }

    const newMapData = {
      fogLivePath: "fog.live.png",
      fogProgressPath: "fog.progress.png"
    };

    if (map.fogProgressPath) {
      fs.removeSync(path.join(mapDirectory, id, map.fogProgressPath));
    }
    if (map.fogLivePath) {
      fs.removeSync(path.join(mapDirectory, id, map.fogLivePath));
    }

    fs.writeFileSync(
      path.join(mapDirectory, id, newMapData.fogLivePath),
      imageData,
      "base64"
    );
    fs.writeFileSync(
      path.join(mapDirectory, id, newMapData.fogProgressPath),
      imageData,
      "base64"
    );

    await this.updateMapSettings(id, newMapData);

    return map;
  }

  async updateMapImage(id, { fileStream, extension }) {
    const map = this.maps.find(map => map.id === id);
    if (!map) {
      throw new Error(`Map with id "${id}" not found.`);
    }
    if (map.mapPath) {
      fs.removeSync(map.mapPath);
    }

    const fileName = "map." + extension;
    const writeStream = fs.createWriteStream(
      path.join(mapDirectory, id, fileName)
    );
    fileStream.pipe(writeStream);
    return new Promise((res, rej) => {
      writeStream.on("close", err => {
        if (err) {
          return rej(err);
        }
        res(this.updateMapSettings(id, { mapPath: fileName }));
      });
    });
  }

  deleteMap(id) {
    const mapIndex = this.maps.findIndex(map => map.id === id);
    if (mapIndex === -1) {
      throw new Error(`Map with id "${id}" not found.`);
    }
    this.maps.splice(mapIndex, 1);
    fs.removeSync(path.join(mapDirectory, id));
  }

  getBasePath(map) {
    return path.join(mapDirectory, map.id);
  }
}

module.exports = { Maps };
