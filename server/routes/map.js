"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const {
  handleUnexpectedError,
  getTmpFile,
  parseFileExtension,
} = require("../util");

let NoteModule;

const mapToken = (token) => {
  if (!NoteModule) {
    NoteModule = require("../graphql/modules/notes");
  }
  if (!token.reference) return token;
  return {
    ...token,
    reference: {
      ...token.reference,
      id: NoteModule.encodeNoteId(token.reference.id),
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

module.exports = ({ roleMiddleware, maps, settings, io }) => {
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

    req.busboy.once("file", (fieldname, file, filename) => {
      fileExtension = parseFileExtension(filename);
      writeStream = fs.createWriteStream(tmpFile);
      file.pipe(writeStream);
    });

    req.once("end", () => {
      if (writeStream !== null) return;
      res.status(422).json({ data: null, error: "No file was sent." });
    });

    req.busboy.once("finish", () => {
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

    req.busboy.once("finish", () => {
      maps
        .updateFogProgressImage(req.params.id, tmpFile)
        .then((map) => {
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

    req.busboy.once("file", (fieldname, file, filename) => {
      writeStream = fs.createWriteStream(tmpFile);
      file.pipe(writeStream);
    });

    req.once("end", () => {
      if (writeStream !== null) return;
      res.status(422).json({ data: null, error: "No file was sent." });
    });

    req.busboy.once("finish", () => {
      maps
        .updateFogLiveImage(req.params.id, tmpFile)
        .then((map) => {
          settings.set("currentMapId", map.id);
          res.json({ error: null, data: mapMap(map) });
          io.emit("map update", {
            map: mapMap(map),
          });
        })
        .catch(handleUnexpectedError(res));
    });
  });

  router.delete("/map/:id", roleMiddleware.dm, (req, res) => {
    const map = maps.get(req.params.id);
    if (!map) {
      return res.send(404);
    }

    maps
      .deleteMap(map.id)
      .then(() => {
        res.status(200).json({
          error: null,
          data: {
            deletedMapId: map.id,
          },
        });
      })
      .catch(handleUnexpectedError(res));
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

  router.post("/map", roleMiddleware.dm, (req, res) => {
    const tmpFile = getTmpFile();
    let writeStream = null;
    let mapTitle = "New Map";
    let fileExtension = null;

    req.pipe(req.busboy);

    req.busboy.once("file", (fieldname, file, filename) => {
      fileExtension = parseFileExtension(filename);
      writeStream = fs.createWriteStream(tmpFile);
      file.pipe(writeStream);
    });

    req.busboy.on("field", (fieldname, value) => {
      if (fieldname === "title") {
        mapTitle = String(value);
      }
    });

    req.once("end", () => {
      if (writeStream !== null) return;
      res.status(422).json({ data: null, error: "No file was sent." });
    });

    req.busboy.once("finish", () => {
      maps
        .createMap({ title: mapTitle, filePath: tmpFile, fileExtension })
        .then((map) => {
          res.status(200).json({ error: null, data: { map: mapMap(map) } });
        })
        .catch(handleUnexpectedError(res));
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

  router.post("/map/:id/token", roleMiddleware.dm, (req, res) => {
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

    maps
      .addToken(map.id, {
        x: req.body.x,
        y: req.body.y,
        color: req.body.color,
        label: req.body.label,
        radius: req.body.radius,
      })
      .then(({ token }) => {
        res.json({
          error: null,
          data: {
            token: mapToken(token),
          },
        });
        io.emit(`token:mapId:${map.id}`, {
          type: "add",
          data: { token: mapToken(token) },
        });
      })
      .catch(handleUnexpectedError(res));
  });

  router.delete("/map/:id/token/:tokenId", roleMiddleware.dm, (req, res) => {
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

    maps
      .removeToken(map.id, req.params.tokenId)
      .then(({ map }) => {
        res.json({
          error: null,
          data: {
            map: mapMap(map),
          },
        });
        io.emit(`token:mapId:${map.id}`, {
          type: "remove",
          data: { tokenId: req.params.tokenId },
        });
      })
      .catch(handleUnexpectedError(res));
  });

  router.patch("/map/:id/token/:tokenId", roleMiddleware.dm, (req, res) => {
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

    maps
      .updateToken(map.id, req.params.tokenId, {
        type: req.body.type,
        label: req.body.label,
        x: req.body.x,
        y: req.body.y,
        color: req.body.color,
        radius: req.body.radius,
        isVisibleForPlayers: req.body.isVisibleForPlayers,
        isLocked: req.body.isLocked,
        title: req.body.title,
        description: req.body.description,
        reference: req.body.reference,
      })
      .then(({ token, map }) => {
        res.json({
          error: null,
          data: {
            map: mapMap(map),
          },
        });
        io.emit(`token:mapId:${map.id}`, {
          type: "update",
          data: { token: mapToken(token) },
        });
      })
      .catch(handleUnexpectedError(res));
  });

  return { router };
};
