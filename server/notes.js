"use strict";

const path = require("path");
const fs = require("fs-extra");
const junk = require("junk");
const uuid = require("uuid/v4");
const { getDataDirectory } = require("./util");

const notesDirectory = path.join(getDataDirectory(), "notes");

const createNote = ({
  id,
  title,
  content,
  createdAt = new Date(),
  updatedAt = new Date(),
}) => ({
  id,
  title,
  content,
  createdAt,
  updatedAt,
});

class Notes {
  constructor() {
    fs.mkdirpSync(notesDirectory);
    this.notes = {}
    this._loadNotes();
  }

  _loadNotes() {
    fs.readdirSync(notesDirectory)
      .filter(junk.not)
      .filter((item) => item.endsWith(".json"))
      .map((fileName) => path.join(notesDirectory, fileName))
      .map((notePath) => {
        const rawConfig = fs.readFileSync(notePath, "utf-8");
        return JSON.parse(rawConfig);
      })
      .forEach((note) => {
        this.notes[note.id] = createNote(note);
      });
  }

  getAll() {
    return Object.values(this.notes);
  }

  getById(id) {
    return this.notes[id] || null;
  }

  createNote({ title, content }) {
    const id = uuid();
    const fileName = `${id}.json`;
    const note = createNote({
      id,
      title,
      content,
    });
    fs.writeFileSync(path.join(notesDirectory, fileName), JSON.stringify(note));
    this.notes[id] = note;
    return note;
  }

  updateNote(id, changes) {
    const note = this.notes[id];
    if (!note) {
      throw new Error(`Note with id "${id}" not found.`);
    }

    Object.assign(note, changes, { updatedAt: new Date() });

    fs.writeFileSync(
      path.join(notesDirectory, `${id}.json`),
      JSON.stringify(note, undefined, 2)
    );

    return note;
  }

  deleteNote(id) {
    const note = this.getById(id);
    if (!note) {
      throw new Error(`Note with id "${id}" not found.`);
    }
    delete this.notes[id];
    fs.removeSync(path.join(notesDirectory, `${id}.json`));
  }
}

module.exports = { Notes };
