"use strict";

const express = require("express");
const fs = require("fs");
const {
  handleUnexpectedError,
  getTmpFile,
  parseFileExtension,
} = require("../util");

module.exports = ({ roleMiddleware, fileStorage }) => {
  const router = express.Router();

  router.post("/images", roleMiddleware.dm, (req, res) => {
    const tmpFile = getTmpFile();
    let writeStream = null;
    let fileExtension = null;
    let fileName = null;

    req.pipe(req.busboy);

    req.busboy.once("file", (fieldname, file, info) => {
      const filename = info.filename;
      fileExtension = parseFileExtension(filename);
      writeStream = fs.createWriteStream(tmpFile);
      fileName = filename;
      file.pipe(writeStream);
    });

    req.once("end", () => {
      if (writeStream !== null) return;
      res.status(422).json({ data: null, error: "No file was sent." });
    });

    req.busboy.once("close", () => {
      fileStorage
        .store({ filePath: tmpFile, fileExtension, fileName })
        .then((record) => {
          res.json({
            error: null,
            data: {
              item: record,
            },
          });
        })
        .catch(handleUnexpectedError(res));
    });
  });

  router.get("/images/:id", (req, res) => {
    fileStorage
      .resolvePath(req.params.id)
      .then((result) => {
        if (result.error) {
          res.status(404).send("404 - Not found.");
          return;
        }
        res.sendFile(result.data.filePath);
      })
      .catch(handleUnexpectedError(res));
  });

  router.patch("/images/:id", (req, res) => {
    const { id } = req.params;

    fileStorage
      .updateById(id, req.body)
      .then((record) => {
        res.json({
          error: null,
          data: {
            image: record,
          },
        });
      })
      .catch(handleUnexpectedError(res));
  });

  router.delete("/images/:id", (req, res) => {
    const { id } = req.params;

    fileStorage
      .deleteById(id)
      .then(() => {
        res.json({
          error: null,
          data: {
            deletedImageId: id,
          },
        });
      })
      .catch(handleUnexpectedError(res));
  });

  router.get("/images", (req, res) => {
    let offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    if (Number.isNaN(offset)) {
      offset = 0;
    }

    fileStorage.list(offset).then((list) => {
      res.json({
        error: null,
        data: {
          list,
        },
      });
    });
  });

  return { router };
};
