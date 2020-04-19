"use strict";

const express = require("express");

module.exports = ({ roleMiddleware, notes, maps, io }) => {
  const router = express.Router();

  router.get("/notes", roleMiddleware.dm, async (req, res) => {
    const allNotes = notes.getAll();

    return res.json({
      error: null,
      data: {
        notes: allNotes,
      },
    });
  });

  router.post("/notes", roleMiddleware.dm, (req, res) => {
    const title = req.body.title || "New note";
    const note = notes.createNote({ title, content: "" });

    return res.json({
      error: null,
      data: {
        note,
      },
    });
  });

  router.patch("/notes/:id", roleMiddleware.dm, (req, res) => {
    let note = notes.getById(req.params.id);
    if (!note) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Note with id '${req.params.id}' does not exist.`,
          code: "ERR_NOTE_DOES_NOT_EXIST",
        },
      });
    }

    const title = req.body.title;
    const content = req.body.content;
    const changes = {};

    if (typeof title === "string") {
      changes.title = title;
    }
    if (typeof content === "string") {
      changes.content = content;
    }

    note = notes.updateNote(note.id, changes);

    res.json({
      error: null,
      data: {
        note,
      },
    });
  });

  router.delete("/notes/:id", roleMiddleware.dm, (req, res) => {
    const note = notes.getById(req.params.id);
    if (!note) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Note with id '${req.params.id}' does not exist.`,
          code: "ERR_NOTE_DOES_NOT_EXIST",
        },
      });
    }

    notes.deleteNote(note.id);

    // update tokens that link a certain note
    maps
      .getAll()
      .map((map) => ({
        mapId: map.id,
        affectedTokens: map.tokens.filter(
          (token) =>
            token.reference &&
            token.reference.type === "note" &&
            token.reference.id === note.id
        ),
      }))
      .forEach(({ mapId, affectedTokens }) => {
        affectedTokens.forEach(({ id }) => {
          maps.updateToken(mapId, id, { reference: null }).then(({ token }) => {
            io.emit(`token:mapId:${mapId}`, {
              type: "update",
              data: { token },
            });
          });
        });
      });

    res.json({
      error: null,
      data: {
        deletedNoteId: note.id,
      },
    });
  });

  router.get("/notes/:id", roleMiddleware.dm, (req, res) => {
    const note = notes.getById(req.params.id);

    if (!note) {
      return res.status(404).json({
        data: null,
        error: {
          message: `Note with id '${req.params.id}' does not exist.`,
          code: "ERR_NOTE_DOES_NOT_EXIST",
        },
      });
    }

    res.json({
      error: null,
      data: {
        note,
      },
    });
  });

  return { router };
};
