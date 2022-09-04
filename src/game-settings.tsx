import * as React from "react";

interface GameSettings {
  autoSendMapUpdates: boolean;
  clientsFollowDM: boolean;
}

const defaultGameSettings: GameSettings = {
  autoSendMapUpdates: false,
  clientsFollowDM: false,
};

const getGameSettings = (): GameSettings => {
  const foundGameSettings = window.localStorage.getItem("settings.game");
  if (foundGameSettings) {
    return Object.assign(defaultGameSettings, JSON.parse(foundGameSettings));
  }
  return defaultGameSettings;
};

const writeGameSettings = (gameSettings: GameSettings) => {
  //write settings to localstorage
  window.localStorage.setItem("settings.game", JSON.stringify(gameSettings));
};

type SetFunction = (value: GameSettings) => void;

type ContextType = {
  value: GameSettings;
  setValue: SetFunction;
};

const Context = React.createContext<ContextType>({
  setValue: writeGameSettings,
  value: getGameSettings(),
});

export const GameSettingsProvider: React.FC<{}> = (props) => {
  const [state, setState] = React.useState<ContextType>(() => ({
    setValue: (value: GameSettings) => {
      writeGameSettings(value);
      setState((state) => ({
        ...state,
        value,
      }));
    },
    value: getGameSettings(),
  }));

  return <Context.Provider value={state}>{props.children}</Context.Provider>;
};

export const useGameSettings = () => React.useContext(Context);
