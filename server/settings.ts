import * as path from "path";
import * as fs from "fs-extra";

type SettingsEntity = {
  currentMapId: string | null;
};

const defaultSettings: Readonly<SettingsEntity> = {
  currentMapId: null,
};

export class Settings {
  private _settingsPath: string;
  private settings: SettingsEntity;
  constructor({ dataDirectory }: { dataDirectory: string }) {
    this._settingsPath = path.join(dataDirectory, "settings.json");
    let settings = {};
    try {
      const settingsRaw = fs.readFileSync(this._settingsPath, "utf8");
      settings = JSON.parse(settingsRaw);
    } catch (err) {
      fs.writeFileSync(
        this._settingsPath,
        JSON.stringify(defaultSettings, undefined, 2)
      );
    }

    this.settings = Object.assign({}, defaultSettings, settings);
  }

  get(name: keyof SettingsEntity) {
    return this.settings[name];
  }

  set<TKey extends keyof SettingsEntity>(
    name: TKey,
    value: SettingsEntity[TKey]
  ) {
    this.settings[name] = value;
    fs.writeFileSync(
      this._settingsPath,
      JSON.stringify(this.settings, undefined, 2)
    );
  }
}
