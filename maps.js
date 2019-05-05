"use strict";

const path = require("path");
const fs = require("fs");
const junk = require("junk");
const uuid = require("uuid/v4");

const isDirectory = source => fs.lstatSync(source).isDirectory();
const dataDirectory = path.join(__dirname, "data");
const mapDirectory = path.join(__dirname, "data", "maps");

class Maps {
  constructor() {
    this.maps = this._loadMaps();
  }

  _shimInitialMap() {
    try {
      fs.mkdirSync(dataDirectory);
    } catch (err) {}
    try {
      fs.mkdirSync(mapDirectory);
    } catch (err) {}
    try {
      fs.mkdirSync(path.join(mapDirectory, "1111-1111-1111"));
    } catch (err) {}
    fs.writeFileSync(
      path.join(mapDirectory, "1111-1111-1111"),
      JSON.stringify({ id: "1111-1111-1111" }, undefined, 2)
    );
  }

  _loadMaps() {
    const mapDirectories = fs
      .readdirSync(path.join(mapDirectory))
      .filter(junk.not)
      .map(id => path.join(mapDirectory, id))
      .filter(isDirectory);

    return mapDirectories.map(directory => {
      const rawConfig = fs.readFileSync(path.join(directory, "settings.json"));
      return JSON.parse(rawConfig);
    });
  }

  getAll() {
    return this.maps;
  }

  get(id) {
    return this.maps.find(map => (map.id = id));
  }

  createMap({ name }) {
    const id = uuid();
    fs.mkdirSync(path.join(mapDirectory, id));
    const map = {
      name,
      // automatically saved after interaction
      fogProgressPath: null,
      // progress becomes live when DM publishes map
      fogLivePath: null,
      mapPath: null
    };

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
      try {
        fs.unlinkSync(path.join(mapDirectory, id, map.fogProgressPath));
      } catch (err) {}
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
      try {
        fs.unlinkSync(path.join(mapDirectory, id, map.fogProgressPath));
      } catch (err) {}
    }
    if (map.fogLivePath) {
      try {
        fs.unlinkSync(path.join(mapDirectory, id, map.fogLivePath));
      } catch (err) {}
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
      fs.unlinkSync(map.mapPath);
    }

    const fileName = "map." + extension;
    const writeStream = fs.createWriteStream(
      path.join(mapDirectory, id, fileName)
    );
    fileStream.pipe(writeStream);
    console.log("LELELE");
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
  }

  getBasePath(map) {
    return path.join(mapDirectory, map.id);
  }
}

module.exports = { Maps };
