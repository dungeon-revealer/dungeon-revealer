import path from "path";
import fs from "fs-extra";
import junk from "junk";
import { v4 as uuid } from "uuid";

const isDirectory = (source: string) => fs.lstatSync(source).isDirectory();

const prepareToken = (token: { [key: string]: unknown }) => {
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
  if (token.isMovableByPlayers === undefined) {
    token.isMovableByPlayers = true;
  }
  if (token.reference === undefined) {
    token.reference = null;
  }

  return token;
};

type MapGridEntity = {
  color: string;
  offsetX: number;
  offsetY: number;
  columnWidth: number;
  columnHeight: number;
};

const prepareGrid = (
  grid: null | undefined | { [key: string]: unknown },
  gridColor: string | null | undefined
): MapGridEntity | null => {
  if (!grid) {
    return null;
  }

  const _gridColor = grid?.color ?? gridColor;
  const _offsetX = grid?.offsetX ?? grid?.x;
  const _offsetY = grid?.offsetY ?? grid?.y;
  const _columnWidth = grid?.columnWidth ?? grid?.sideLength;
  const _columnHeight = grid?.columnHeight ?? grid?.sideLength;

  return {
    color: typeof _gridColor === "string" ? _gridColor : "red",
    offsetX: typeof _offsetX === "number" ? _offsetX : 0,
    offsetY: typeof _offsetY === "number" ? _offsetY : 0,
    columnWidth: typeof _columnWidth === "number" ? _columnWidth : 10,
    columnHeight: typeof _columnHeight === "number" ? _columnHeight : 10,
  };
};

type LegacyMapEntity = {
  id: string;
  title: string;
  fogProgressPath: string;
  fogLivePath: string;
  mapPath: string;
  showGrid?: boolean;
  showGridToPlayers?: boolean;
  gridColor?: string;
  grid?: {
    x: number;
    y: number;
    sideLength: number;
  };
};

type MapEntity = {
  id: string;
  title: string;
  fogProgressPath: string | null;
  fogLivePath: string | null;
  mapPath: string;
  showGrid: boolean;
  showGridToPlayers: boolean;
  grid: null | MapGridEntity;
  tokens: Array<any>;
};

class Maps {
  private _maps: Array<MapEntity>;
  private _mapsDirectoryPath: string;
  private _processTask: (
    operationIdentifier: string,
    process: () => unknown
  ) => Promise<unknown>;

  constructor({
    processTask,
    dataDirectory,
  }: {
    processTask: (
      operationIdentifier: string,
      process: () => unknown
    ) => Promise<unknown>;
    dataDirectory: string;
  }) {
    this._mapsDirectoryPath = path.join(dataDirectory, "maps");
    fs.mkdirpSync(this._mapsDirectoryPath);
    this._processTask = processTask;
    this._maps = this._loadMaps();
  }

  _buildMapFolderPath(mapId: string) {
    return path.join(this._mapsDirectoryPath, mapId);
  }

  _loadMaps() {
    const mapDirectories = fs
      .readdirSync(this._mapsDirectoryPath)
      .filter(junk.not)
      .map((id) => this._buildMapFolderPath(id))
      .filter(isDirectory);

    return mapDirectories.map((directory) => {
      const rawConfig = fs.readFileSync(
        path.join(directory, "settings.json"),
        "utf-8"
      );
      const rawMap = JSON.parse(rawConfig) as LegacyMapEntity | MapEntity;
      const map: MapEntity = {
        id: rawMap.id,
        title: rawMap.title,
        mapPath: rawMap.mapPath,
        fogProgressPath: rawMap.fogProgressPath ?? null,
        fogLivePath: rawMap.fogLivePath ?? null,
        showGrid: rawMap.showGrid ?? false,
        showGridToPlayers: rawMap.showGridToPlayers ?? false,
        grid: prepareGrid(
          rawMap.grid,
          "gridColor" in rawMap ? rawMap.gridColor : null
        ),
        tokens: "tokens" in rawMap ? rawMap.tokens.map(prepareToken) : [],
      };
      return map;
    });
  }

  getBasePath(map: { id: string }) {
    return path.join(this._mapsDirectoryPath, map.id);
  }

  getAll() {
    return this._maps;
  }

  get(id: string) {
    return this._maps.find((map) => map.id === id) ?? null;
  }

  async createMap({
    title,
    filePath,
    fileExtension,
  }: {
    title: string;
    filePath: string;
    fileExtension: string;
  }) {
    const id = uuid();
    return this._processTask(`map:${id}`, async () => {
      fs.mkdirp(this._buildMapFolderPath(id));
      const mapPath = `map${fileExtension ? `.${fileExtension}` : ``}`;
      const map: MapEntity = {
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
        tokens: [],
      };

      await fs.move(filePath, path.join(this._buildMapFolderPath(id), mapPath));
      await fs.writeFile(
        path.join(this._mapsDirectoryPath, id, "settings.json"),
        JSON.stringify(map, undefined, 2)
      );

      this._maps.push(map);

      return map;
    });
  }

  async _updateMapSettings(map: MapEntity, data: Partial<MapEntity>) {
    Object.assign(map, data);

    await fs.writeFile(
      path.join(this._buildMapFolderPath(map.id), "settings.json"),
      JSON.stringify(map, undefined, 2)
    );

    return map;
  }

  async updateMapSettings(id: string, data: Partial<MapEntity>) {
    return await this._processTask(`map:${id}`, async () => {
      const map = this._maps.find((map) => map.id === id);
      if (!map) {
        throw new Error(`Map with id "${id}" not found.`);
      }
      return await this._updateMapSettings(map, data);
    });
  }

  async updateFogProgressImage(id: string, filePath: string) {
    return await this._processTask(`map:${id}`, async () => {
      const map = this._maps.find((map) => map.id === id);
      if (!map) {
        throw new Error(`Map with id "${id}" not found.`);
      }

      const mapFolderPath = this._buildMapFolderPath(map.id);

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

  async updateFogLiveImage(id: string, filePath: string) {
    return await this._processTask(`map:${id}`, async () => {
      const map = this._maps.find((map) => map.id === id);
      if (!map) {
        throw new Error(`Map with id "${id}" not found.`);
      }

      const newMapData = {
        fogLivePath: "fog.live.png",
        fogProgressPath: "fog.progress.png",
      };

      if (map.fogProgressPath) {
        await fs.remove(
          path.join(this._buildMapFolderPath(map.id), map.fogProgressPath)
        );
      }
      if (map.fogLivePath) {
        await fs.remove(
          path.join(this._buildMapFolderPath(map.id), map.fogLivePath)
        );
      }

      const livePath = path.join(
        this._mapsDirectoryPath,
        id,
        newMapData.fogLivePath
      );
      // prettier-ignore
      const progressPath = path.join(this._buildMapFolderPath(map.id), newMapData.fogProgressPath);

      await fs.copyFile(filePath, livePath);
      await fs.move(filePath, progressPath);

      const updatedMap = await this._updateMapSettings(map, newMapData);

      return updatedMap;
    });
  }

  async updateMapImage(
    id: string,
    { filePath, fileExtension }: { filePath: string; fileExtension: string }
  ) {
    return await this._processTask(`map:${id}`, async () => {
      const map = this._maps.find((map) => map.id === id);
      if (!map) {
        throw new Error(`Map with id "${id}" not found.`);
      }
      if (map.mapPath) {
        await fs.remove(map.mapPath);
      }

      const fileName = `map${fileExtension ? `.${fileExtension}` : ``}`;
      const destination = path.join(this._buildMapFolderPath(map.id), fileName);
      await fs.move(filePath, destination);

      const result = await this._updateMapSettings(map, { mapPath: fileName });
      return result;
    });
  }

  async addToken(
    mapId: string,
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
    mapId: string,
    tokenId: string,
    {
      type,
      x,
      y,
      radius,
      color,
      label,
      isVisibleForPlayers,
      isLocked,
      isMovableByPlayers,
      title,
      description,
      reference,
    }: {
      type?: string;
      x?: number;
      y?: number;
      radius?: number;
      color?: number;
      label?: string;
      isVisibleForPlayers?: boolean;
      isLocked?: boolean;
      isMovableByPlayers?: boolean;
      title?: string;
      description?: string;
      reference?:
        | null
        | undefined
        | {
            type: string;
            id: string;
          };
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
      if (isMovableByPlayers !== undefined) {
        token.isMovableByPlayers = isMovableByPlayers;
      }
      if (reference !== undefined) {
        if (reference === null) {
          token.reference = null;
        } else {
          token.reference = reference = {
            type: reference.type,
            id: reference.id,
          };
        }
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

  async removeToken(mapId: string, tokenId: string) {
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

  async deleteMap(id: string) {
    return await this._processTask(`map:${id}`, async () => {
      const mapIndex = this._maps.findIndex((map) => map.id === id);
      if (mapIndex === -1) {
        throw new Error(`Map with id "${id}" not found.`);
      }
      this._maps.splice(mapIndex, 1);
      await fs.remove(this._buildMapFolderPath(id));
    });
  }
}

module.exports = { Maps };
