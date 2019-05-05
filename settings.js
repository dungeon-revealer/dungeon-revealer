"use strict";

const path = require("path");
const fs = require("fs");

const settingsPath = path.join(__dirname, "data", "settings.json");

const defaultSettings = {
  currentMapId: "1111-1111-1111"
};

class Settings {
  constructor() {
    let settings = {};
    try {
      const settingsRaw = fs.readFileSync(settingsPath);
      settings = JSON.parse(settingsRaw);
    } catch (err) {}

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
