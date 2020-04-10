"use strict";

const path = require("path");
const fs = require("fs");

const defaultSettings = {
  currentMapId: null,
};

class Settings {
  constructor({ dataDirectory }) {
    this._settingsPath = path.join(dataDirectory, "settings.json");
    let settings = {};
    try {
      const settingsRaw = fs.readFileSync(this._settingsPath);
      settings = JSON.parse(settingsRaw);
      // eslint-disable-next-line no-empty
    } catch (err) {
      fs.writeFileSync(
        this._settingsPath,
        JSON.stringify(defaultSettings, undefined, 2)
      );
    }

    this.settings = Object.assign({}, defaultSettings, settings);
  }

  get(name) {
    return this.settings[name];
  }

  set(name, value) {
    this.settings[name] = value;
    fs.writeFileSync(
      this._settingsPath,
      JSON.stringify(this.settings, undefined, 2)
    );
  }
}

module.exports = { Settings };
