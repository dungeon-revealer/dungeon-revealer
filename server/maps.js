"use strict";

const path = require("path");
const fs = require("fs-extra");
const junk = require("junk");
const uuid = require("uuid/v4");
const { getDataDirectory } = require("./util");

const mapDirectory = path.join(getDataDirectory(), "maps");
const isDirectory = (source) => fs.lstatSync(source).isDirectory();

const prepareToken = (token) => {
  if (typeof token.type !== "string") {
    token.type = "entity";
  }
  if (typeof token.title !== "string") {
    token.title = "";
  }
  if (typeof token.title !== "string") {
    token.description = "";
  }
  if (token.isLocked === undefined) {
    token.isLocked = false;
  }
  if (token.reference === undefined) {
    token.reference = null;
  }

  return token;
};

class Maps {
  constructor({ processTask }) {
    fs.mkdirpSync(mapDirectory);
    this._processTask = processTask;
    this.maps = this._loadMaps();
  }

  _loadMaps() {
    const mapDirectories = fs
      .readdirSync(path.join(mapDirectory))
      .filter(junk.not)
      .map((id) => path.join(mapDirectory, id))
      .filter(isDirectory);

    return mapDirectories.map((directory) => {
      const rawConfig = fs.readFileSync(
        path.join(directory, "settings.json"),
        "utf-8"
      );
      const map = { grid: null, tokens: [], ...JSON.parse(rawConfig) };
      map.tokens = map.tokens.map(prepareToken);
      return map;
    });
  }

  getBasePath(map) {
    return path.join(mapDirectory, map.id);
  }

  getAll() {
    return this.maps;
  }

  get(id) {
    return this.maps.find((map) => map.id === id) || null;
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
      tokens: [],
    };

    fs.moveSync(file.path, path.join(mapDirectory, id, mapPath));

    fs.writeFileSync(
      path.join(mapDirectory, id, "settings.json"),
      JSON.stringify(map, undefined, 2)
    );

    this.maps.push(map);

    return map;
  }

  _updateMapSettings(id, data) {
    const map = this.maps.find((map) => map.id === id);
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

  async updateMapSettings(id, data) {
    return await this._processTask(`map:${id}`, async () => {
      return this._updateMapSettings(id, data);
    });
  }

  async updateFogProgressImage(id, fileStream) {
    return await this._processTask(`map:${id}`, async () => {
      const map = this.maps.find((map) => map.id === id);
      if (!map) {
        throw new Error(`Map with id "${id}" not found.`);
      }

      const mapFolderPath = path.join(mapDirectory, id);

      if (map.fogProgressPath) {
        fs.removeSync(path.join(mapFolderPath, map.fogProgressPath));
      }

      const newMapData = {
        fogProgressPath: "fog.progress.png",
      };

      const writeStream = fs.createWriteStream(
        path.join(mapFolderPath, newMapData.fogProgressPath)
      );
      fileStream.pipe(writeStream);

      await new Promise((res, rej) => {
        writeStream.on("close", (err) => {
          if (err) {
            return rej(err);
          }
          res();
        });
      });

      return await this._updateMapSettings(id, newMapData);
    });
  }

  async updateFogLiveImage(id, fileStream) {
    return await this._processTask(`map:${id}`, async () => {
      const map = this.maps.find((map) => map.id === id);
      if (!map) {
        throw new Error(`Map with id "${id}" not found.`);
      }

      const newMapData = {
        fogLivePath: "fog.live.png",
        fogProgressPath: "fog.progress.png",
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
          liveFogWriteStream.on("close", (err) => {
            if (err) {
              return rej(err);
            }
            res();
          });
        }),
        new Promise((res, rej) => {
          fogProgressWriteStream.on("close", (err) => {
            if (err) {
              return rej(err);
            }
            res();
          });
        }),
      ]);

      const updatedMap = this._updateMapSettings(id, newMapData);

      return updatedMap;
    });
  }

  async updateMapImage(id, { fileStream, extension }) {
    return await this._processTask(`map:${id}`, async () => {
      const map = this.maps.find((map) => map.id === id);
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
      await new Promise((res, rej) => {
        writeStream.on("close", (err) => {
          if (err) {
            return rej(err);
          }
          res();
        });
      });
      const result = this._updateMapSettings(id, { mapPath: fileName });
      return result;
    });
  }

  async addToken(
    mapId,
    {
      x = 0,
      y = 0,
      radius = 50,
      color = "red",
      label = "A",
      isVisibleForPlayers = false,
      type = "entity",
    }
  ) {
    return await this._processTask(`map:${mapId}`, async () => {
      const token = prepareToken({
        id: uuid(),
        x,
        y,
        radius,
        color,
        label,
        isVisibleForPlayers,
        type,
      });

      const map = this.get(mapId);
      if (!map) {
        throw new Error(`Map with id "${mapId}" not found.`);
      }

      const tokens = map.tokens || [];

      tokens.push(token);

      this._updateMapSettings(mapId, { tokens });

      return {
        map,
        token,
      };
    });
  }

  async updateToken(
    mapId,
    tokenId,
    {
      type,
      x,
      y,
      radius,
      color,
      label,
      isVisibleForPlayers,
      isLocked,
      title,
      description,
      reference,
    }
  ) {
    return await this._processTask(`map:${mapId}`, async () => {
      const map = this.get(mapId);
      if (!map) {
        throw new Error(`Map with id "${mapId}" not found.`);
      }
      const token = (map.tokens || []).find((token) => token.id === tokenId);

      if (!token) {
        throw new Error(
          `Token with id "${tokenId}" does not exist on map with id "${mapId}".`
        );
      }

      if (type !== undefined) {
        token.type = type;
      }
      if (isLocked !== undefined) {
        token.isLocked = isLocked;
      }
      if (title !== undefined) {
        token.title = title;
      }
      if (description !== undefined) {
        token.description = description;
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
      if (isVisibleForPlayers !== undefined) {
        token.isVisibleForPlayers = isVisibleForPlayers;
      }
      if (reference !== undefined) {
        token.reference = reference;
      }

      const updatedMap = this._updateMapSettings(mapId, {
        tokens: map.tokens,
      });

      return {
        map: updatedMap,
        token,
      };
    });
  }

  async removeToken(mapId, tokenId) {
    return await this._processTask(`map:${mapId}`, async () => {
      const map = this.get(mapId);
      if (!map) {
        throw new Error(`Map with id "${mapId}" not found.`);
      }

      const tokens = (map.tokens || []).filter((token) => token.id !== tokenId);
      const updatedMap = this.updateMapSettings(mapId, { tokens });

      return { map: updatedMap };
    });
  }

  async deleteMap(id) {
    return await this._processTask(`map:${id}`, async () => {
      const mapIndex = this.maps.findIndex((map) => map.id === id);
      if (mapIndex === -1) {
        throw new Error(`Map with id "${id}" not found.`);
      }
      this.maps.splice(mapIndex, 1);
      fs.removeSync(path.join(mapDirectory, id));
    });
  }
}

module.exports = { Maps };
