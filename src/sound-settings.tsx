import * as React from "react";
import * as t from "io-ts";
import * as E from "fp-ts/lib/Either";
import { pipe, flow } from "fp-ts/lib/function";

const SoundModeAll = t.literal("all");
const SoundModeDiceOnly = t.literal("dice-only");
const SoundModeNone = t.literal("none");

const SoundMode = t.union([SoundModeAll, SoundModeDiceOnly, SoundModeNone]);

const readValueFromLocalStorage = (key: string) => () =>
  E.tryCatch(() => window.localStorage.getItem(key), E.toError);

const writeValueToLocalStorage = (key: string) => (value: string) =>
  E.tryCatch(() => window.localStorage.setItem(key, value), E.toError);

const readSoundMode = flow(
  readValueFromLocalStorage("settings.sound"),
  E.chainW(SoundMode.decode),
  E.fold(
    () => SoundMode.encode("all"),
    (value) => value
  )
);

const writeSoundMode = pipe(writeValueToLocalStorage("settings.sound"));

type SetFunction = (value: t.TypeOf<typeof SoundMode>) => void;

type ContextType = {
  value: t.TypeOf<typeof SoundMode>;
  setValue: SetFunction;
};

const Context = React.createContext<ContextType>({
  setValue: writeSoundMode,
  value: SoundMode.encode("all"),
});

export const SoundSettingsProvider: React.FC<{}> = (props) => {
  const [state, setState] = React.useState<ContextType>(() => ({
    setValue: (value) => {
      writeSoundMode(value);
      setState((state) => ({
        ...state,
        value,
      }));
    },
    value: readSoundMode(),
  }));

  return <Context.Provider value={state}>{props.children}</Context.Provider>;
};

export const useSoundSettings = () => React.useContext(Context);
