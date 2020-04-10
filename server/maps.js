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

  async createMap({ title, filePath }) {
    const id = uuid();
    return this._processTask(`map:${id}`, async () => {
      fs.mkdirp(path.join(mapDirectory, id));
      const mapPath = `map`;
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

      await fs.move(filePath, path.join(mapDirectory, id, mapPath));
      await fs.writeFile(
        path.join(mapDirectory, id, "settings.json"),
        JSON.stringify(map, undefined, 2)
      );

      this.maps.push(map);

      return map;
    });
  }

  async _updateMapSettings(map, data) {
    Object.assign(map, data);

    await fs.writeFile(
      path.join(mapDirectory, map.id, "settings.json"),
      JSON.stringify(map, undefined, 2)
    );

    return map;
  }

  async updateMapSettings(id, data) {
    return await this._processTask(`map:${id}`, async () => {
      const map = this.maps.find((map) => map.id === id);
      if (!map) {
        throw new Error(`Map with id "${id}" not found.`);
      }
      return await this._updateMapSettings(map, data);
    });
  }

  async updateFogProgressImage(id, filePath) {
    return await this._processTask(`map:${id}`, async () => {
      const map = this.maps.find((map) => map.id === id);
      if (!map) {
        throw new Error(`Map with id "${id}" not found.`);
      }

      const mapFolderPath = path.join(mapDirectory, id);

      if (map.fogProgressPath) {
        await fs.remove(path.join(mapFolderPath, map.fogProgressPath));
      }

      const newMapData = {
        fogProgressPath: "fog.progress.png",
      };

      const fileDestination = path.join(
        mapFolderPath,
        newMapData.fogProgressPath
      );
      await fs.move(filePath, fileDestination);
      return await this._updateMapSettings(map, newMapData);
    });
  }

  async updateFogLiveImage(id, filePath) {
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
        await fs.remove(path.join(mapDirectory, id, map.fogProgressPath));
      }
      if (map.fogLivePath) {
        await fs.remove(path.join(mapDirectory, id, map.fogLivePath));
      }

      const livePath = path.join(mapDirectory, id, newMapData.fogLivePath);
      // prettier-ignore
      const progressPath = path.join(mapDirectory, id, newMapData.fogProgressPath);

      await fs.copyFile(filePath, livePath);
      await fs.move(filePath, progressPath);

      const updatedMap = await this._updateMapSettings(map, newMapData);

      return updatedMap;
    });
  }

  async updateMapImage(id, { filePath, extension }) {
    return await this._processTask(`map:${id}`, async () => {
      const map = this.maps.find((map) => map.id === id);
      if (!map) {
        throw new Error(`Map with id "${id}" not found.`);
      }
      if (map.mapPath) {
        await fs.remove(map.mapPath);
      }

      const fileName = "map." + extension;
      const destination = path.join(mapDirectory, id, fileName);
      await fs.move(filePath, destination);

      const result = await this._updateMapSettings(map, { mapPath: fileName });
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

      await this._updateMapSettings(map, { tokens });

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

      const updatedMap = await this._updateMapSettings(map, {
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
      const updatedMap = await this._updateMapSettings(map, { tokens });

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
