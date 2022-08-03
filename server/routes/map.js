"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const {
  handleUnexpectedError,
  getTmpFile,
  parseFileExtension,
} = require("../util");

const mapToken = (token) => {
  if (!token.reference) return token;
  return {
    ...token,
    reference: {
      ...token.reference,
      id: token.reference.id,
    },
  };
};

const mapMap = (map) => {
  if (!map) return map;
  return {
    ...map,
    ...(map.tokens
      ? {
          tokens: map.tokens.map(mapToken),
        }
      : {}),
  };
};

module.exports = ({ roleMiddleware, maps, settings, emitter }) => {
  const router = express.Router();

  router.get("/map/:id/map", roleMiddleware.pc, (req, res) => {
    const map = maps.get(req.params.id);
    if (!map) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Map with id '${req.params.id}' does not exist.`,
          code: "ERR_MAP_DOES_NOT_EXIST",
        },
      });
    } else if (!map.mapPath) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Map with id '${req.params.id}' does not have a map image yet.`,
          code: "ERR_MAP_NO_IMAGE",
        },
      });
    }

    const basePath = maps.getBasePath(map);

    return res.sendFile(path.join(basePath, map.mapPath));
  });

  router.get("/map/:id/fog", roleMiddleware.dm, (req, res) => {
    const map = maps.get(req.params.id);
    if (!map) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Map with id '${req.params.id}' does not exist.`,
          code: "ERR_MAP_DOES_NOT_EXIST",
        },
      });
    } else if (!map.fogProgressPath) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Map with id '${req.params.id}' does not have a fog image yet.`,
          code: "ERR_MAP_NO_FOG",
        },
      });
    }
    return res.sendFile(path.join(maps.getBasePath(map), map.fogProgressPath));
  });

  router.get("/map/:id/fog-live", roleMiddleware.pc, (req, res) => {
    const map = maps.get(req.params.id);
    if (!map) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Map with id '${req.params.id}' does not exist.`,
          code: "ERR_MAP_DOES_NOT_EXIST",
        },
      });
    } else if (!map.fogLivePath) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Map with id '${req.params.id}' does not have a fog image yet.`,
          code: "ERR_MAP_NO_FOG",
        },
      });
    }

    return res.sendFile(path.join(maps.getBasePath(map), map.fogLivePath));
  });

  router.post("/map/:id/map", roleMiddleware.dm, (req, res) => {
    const tmpFile = getTmpFile();
    let writeStream = null;
    let fileExtension = null;

    req.pipe(req.busboy);

    req.busboy.once("file", (fieldname, file, info) => {
      const filename = info.filename;
      fileExtension = parseFileExtension(filename);
      writeStream = fs.createWriteStream(tmpFile);
      file.pipe(writeStream);
    });

    req.once("end", () => {
      if (writeStream !== null) return;
      res.status(422).json({ data: null, error: "No file was sent." });
    });

    req.busboy.once("close", () => {
      maps
        .updateMapImage(req.params.id, { filePath: tmpFile, fileExtension })
        .then((map) => {
          res.status(200).json({ error: null, data: mapMap(map) });
        })
        .catch(handleUnexpectedError(res));
    });
  });

  router.post("/map/:id/fog", roleMiddleware.dm, (req, res) => {
    const tmpFile = getTmpFile();
    let writeStream = null;
    req.pipe(req.busboy);

    req.busboy.once("file", (fieldname, file) => {
      writeStream = fs.createWriteStream(tmpFile);
      file.pipe(writeStream);
    });

    req.once("end", () => {
      if (writeStream !== null) return;
      res.status(422).json({ data: null, error: "No file was sent." });
    });

    req.busboy.once("close", () => {
      maps
        .updateFogProgressImage(req.params.id, tmpFile)
        .then((map) => {
          emitter.emit("invalidate", `Map:${map.id}`);
          res.status(200).json({
            error: null,
            data: mapMap(map),
          });
        })
        .catch(handleUnexpectedError(res));
    });
  });

  router.post("/map/:id/send", roleMiddleware.dm, (req, res) => {
    const tmpFile = getTmpFile();
    let writeStream = null;

    req.pipe(req.busboy);

    req.busboy.once("file", (_, file) => {
      writeStream = fs.createWriteStream(tmpFile);
      file.pipe(writeStream);
    });

    req.once("end", () => {
      if (writeStream !== null) return;
      res.status(422).json({ data: null, error: "No file was sent." });
    });

    req.busboy.once("close", () => {
      maps
        .updateFogLiveImage(req.params.id, tmpFile)
        .then((map) => {
          settings.set("currentMapId", map.id);
          emitter.emit("invalidate", "Query.activeMap");
          res.json({ error: null, data: mapMap(map) });
        })
        .catch(handleUnexpectedError(res));
    });
  });

  router.get("/map", roleMiddleware.pc, (req, res) => {
    res.json({
      error: null,
      data: {
        currentMapId: settings.get("currentMapId"),
        maps: maps.getAll().map(mapMap),
      },
    });
  });

  router.get("/map/:id", roleMiddleware.dm, async (req, res) => {
    const map = maps.get(req.params.id);
    if (!map) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Map with id '${req.params.id}' does not exist.`,
          code: "ERR_MAP_DOES_NOT_EXIST",
        },
      });
    }

    return res.status(200).json({
      data: map,
    });
  });

  router.patch("/map/:id", roleMiddleware.dm, async (req, res) => {
    const map = maps.get(req.params.id);
    if (!map) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Map with id '${req.params.id}' does not exist.`,
          code: "ERR_MAP_DOES_NOT_EXIST",
        },
      });
    }
    const updates = {};

    if (req.body.title) {
      updates.title = req.body.title;
    }
    if (req.body.grid) {
      updates.grid = req.body.grid;
      updates.showGrid = true;
    }
    if ({}.hasOwnProperty.call(req.body, "showGrid")) {
      updates.showGrid = req.body.showGrid;
    }
    if ({}.hasOwnProperty.call(req.body, "showGridToPlayers")) {
      updates.showGridToPlayers = req.body.showGridToPlayers;
    }
    if ({}.hasOwnProperty.call(req.body, "gridColor")) {
      updates.gridColor = req.body.gridColor;
    }

    (Object.keys(updates).length > 0
      ? maps.updateMapSettings(map.id, updates)
      : Promise.resolve(map)
    )
      .then((map) => {
        res.json({
          error: null,
          data: {
            map: mapMap(map),
          },
        });
      })
      .catch(handleUnexpectedError(res));
  });

  router.patch("/map/:id/token/:tokenId", roleMiddleware.pc, (req, res) => {
    const map = maps.get(req.params.id);
    const token = map.tokens?.find((token) => token.id === req.params.tokenId);

    if (!map) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Map with id '${req.params.id}' does not exist.`,
          code: "ERR_MAP_DOES_NOT_EXIST",
        },
      });
    }

    if (!token || (req.role === "PC" && token.isVisibleForPlayers === false)) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Token with id '${req.params.tokenId}' does not exist.`,
          code: "ERR_TOKEN_DOES_NOT_EXIST",
        },
      });
    }

    let updates = {};

    if (
      req.role === "DM" ||
      (req.role === "PC" &&
        token.isLocked === false &&
        token.isMovableByPlayers === true)
    ) {
      updates = { ...updates, x: req.body.x, y: req.body.y };
    }

    if (req.role === "DM") {
      updates = {
        ...updates,
        type: req.body.type,
        label: req.body.label,
        color: req.body.color,
        radius: req.body.radius,
        rotation: req.body.rotation,
        isVisibleForPlayers: req.body.isVisibleForPlayers,
        isLocked: req.body.isLocked,
        isMovableByPlayers: req.body.isMovableByPlayers,
        title: req.body.title,
        description: req.body.description,
        reference: req.body.reference,
        tokenImageId: req.body.tokenImageId,
      };
    }

    maps
      .updateToken(map.id, req.params.tokenId, updates)
      .then(({ map }) => {
        res.json({
          error: null,
          data: {
            map: mapMap(map),
          },
        });
        emitter.emit("invalidate", `Map:${map.id}`);
      })
      .catch(handleUnexpectedError(res));
  });

  return { router };
};
