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
      return { grid: null, tokens: [], ...JSON.parse(rawConfig) };
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
      grid: null,
      showGrid: false,
      showGridToPlayers: false,
      gridColor: "rgba(0, 0, 0, 0.5)",
      tokens: []
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

  async updateFogProgressImage(id, fileStream) {
    const map = this.maps.find(map => map.id === id);
    if (!map) {
      throw new Error(`Map with id "${id}" not found.`);
    }
    const mapFolderPath = path.join(mapDirectory, id);
    if (map.fogProgressPath) {
      fs.removeSync(path.join(mapFolderPath, map.fogProgressPath));
    }

    const newMapData = {
      fogProgressPath: "fog.progress.png"
    };

    const writeStream = fs.createWriteStream(
      path.join(mapFolderPath, newMapData.fogProgressPath)
    );
    fileStream.pipe(writeStream);

    return new Promise((res, rej) => {
      writeStream.on("close", err => {
        if (err) {
          return rej(err);
        }
        res(this.updateMapSettings(id, newMapData));
      });
    });
  }

  async updateFogLiveImage(id, fileStream) {
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

    const liveFogWriteStream = fs.createWriteStream(
      path.join(mapDirectory, id, newMapData.fogLivePath)
    );
    fileStream.pipe(liveFogWriteStream);

    const fogProgressWriteStream = fs.createWriteStream(
      path.join(mapDirectory, id, newMapData.fogProgressPath)
    );
    fileStream.pipe(fogProgressWriteStream);

    await Promise.all([
      new Promise((res, rej) => {
        liveFogWriteStream.on("close", err => {
          if (err) {
            return rej(err);
          }
          res();
        });
      }),
      new Promise((res, rej) => {
        fogProgressWriteStream.on("close", err => {
          if (err) {
            return rej(err);
          }
          res();
        });
      })
    ]);

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

  addToken(mapId, { x, y, radius, color, label }) {
    const token = {
      id: uuid(),
      x,
      y,
      radius,
      color,
      label
    };

    const map = this.get(mapId);
    if (!map) {
      throw new Error(`Map with id "${mapId}" not found.`);
    }

    const tokens = map.tokens || [];

    tokens.push(token);

    this.updateMapSettings(mapId, { tokens });

    return {
      map,
      token
    };
  }

  updateToken(mapId, tokenId, { x, y, radius, color, label }) {
    const map = this.get(mapId);
    if (!map) {
      throw new Error(`Map with id "${mapId}" not found.`);
    }
    const token = (map.tokens || []).find(token => token.id === tokenId);

    if (!token) {
      throw new Error(
        `Token with id "${tokenId}" does not exist on map with id "${mapId}".`
      );
    }

    if (x !== undefined) {
      token.x = x;
    }
    if (y !== undefined) {
      token.y = y;
    }
    if (radius !== undefined) {
      token.radius = radius;
    }
    if (color !== undefined) {
      token.color = color;
    }
    if (label !== undefined) {
      token.label = label;
    }

    const updatedMap = this.updateMapSettings(mapId, {
      tokens: map.tokens
    });

    return {
      map: updatedMap,
      token
    };
  }

  removeToken(mapId, tokenId) {
    const map = this.get(mapId);
    if (!map) {
      throw new Error(`Map with id "${mapId}" not found.`);
    }

    const tokens = (map.tokens || []).filter(token => token.id !== tokenId);
    const updatedMap = this.updateMapSettings(mapId, { tokens });

    return { map: updatedMap };
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
