"use strict";

const path = require("path");
const fs = require("fs");
const { getDataDirectory } = require("./util");

const settingsPath = path.join(getDataDirectory(), "settings.json");

const defaultSettings = {
  currentMapId: null,
};

class Settings {
  constructor() {
    let settings = {};
    try {
      const settingsRaw = fs.readFileSync(settingsPath);
      settings = JSON.parse(settingsRaw);
      // eslint-disable-next-line no-empty
    } catch (err) {
      fs.writeFileSync(
        settingsPath,
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
    fs.writeFileSync(settingsPath, JSON.stringify(this.settings, undefined, 2));
  }
}

module.exports = { Settings };
