"use strict";

const path = require("path");
const fs = require("fs-extra");
const junk = require("junk");
const uuid = require("uuid/v4");
const { getDataDirectory } = require("./util");

const notesDirectory = path.join(getDataDirectory(), "notes");

class Notes {
  constructor() {
    fs.mkdirpSync(notesDirectory);
    this.notes = this._loadNotes();
  }

  _loadNotes() {
    const notes = fs
      .readdirSync(notesDirectory)
      .filter(junk.not)
      .filter(item => item.endsWith(".json"))
      .map(fileName => path.join(notesDirectory, fileName));

    return notes.map(notePath => {
      const rawConfig = fs.readFileSync(notePath, "utf-8");
      return JSON.parse(rawConfig);
    });
  }

  getAll() {
    return this.notes;
  }

  getById(id) {
    return this.notes.find(note => note.id === id) || null;
  }

  createNote({ title, content }) {
    const id = uuid();
    const fileName = `${id}.json`;
    const note = {
      id,
      title,
      content
    };
    fs.writeFileSync(path.join(notesDirectory, fileName), JSON.stringify(note));
    this.notes.push(note);
    return note;
  }

  updateNote(id, changes) {
    const note = this.notes.find(map => map.id === id);
    if (!note) {
      throw new Error(`Note with id "${id}" not found.`);
    }
    Object.assign(note, changes);

    fs.writeFileSync(
      path.join(notesDirectory, `${id}.json`),
      JSON.stringify(note, undefined, 2)
    );

    return note;
  }

  deleteNote(id) {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) {
      throw new Error(`Note with id "${id}" not found.`);
    }
    this.notes.splice(noteIndex, 1);
    fs.removeSync(path.join(notesDirectory, `${id}.json`));
  }
}

module.exports = { Notes };
