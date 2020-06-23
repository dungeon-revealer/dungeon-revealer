import * as React from "react";
import uuid from "uuid/v4";
export { TokenInfoAside } from "./token-info-aside";

type NoteWindow = {
  id: string;
  noteId: string;
};

type NoteWindowInterface = {
  windows: NoteWindow[];
  showNoteInWindow: (noteId: string, windowId: string) => void;
  showNoteInNewWindow: (noteId: string) => void;
  destroyWindow: (windowId: string) => void;
  focusOrShowNoteInNewWindow: (noteId: string) => void;
};

const NoteViewContext = React.createContext<NoteWindowInterface | null>(null);

export const NoteWindowContextProvider: React.FC<{}> = ({ children }) => {
  const [windows, setWindows] = React.useState([] as NoteWindow[]);

  const showNoteInNewWindow = React.useCallback((noteId: string) => {
    setWindows((windows) => [...windows, { id: uuid(), noteId }]);
  }, []);

  const showNoteInWindow = React.useCallback(
    (noteId: string, windowId: string) => {
      setWindows((windows) => {
        const record = windows.find((window) => window.id === windowId);
        if (!record) {
          return [...windows, { id: windowId, noteId }];
        }
        const newWindows = windows.filter((window) => window.id !== windowId);
        newWindows.push({ ...record, noteId });
        return newWindows;
      });
    },
    []
  );

  const destroyWindow = React.useCallback((windowId: string) => {
    setWindows((windows) => windows.filter((window) => window.id !== windowId));
  }, []);

  const focusOrShowNoteInNewWindow = React.useCallback((noteId: string) => {
    setWindows((windows) => {
      const record = windows.find((window) => window.noteId === noteId);
      if (!record) {
        return [...windows, { id: uuid(), noteId }];
      }
      const newWindows = windows.filter((window) => window.noteId !== noteId);
      newWindows.push(record);
      return newWindows;
    });
  }, []);

  const value = React.useMemo(() => {
    return {
      windows,
      showNoteInNewWindow,
      showNoteInWindow,
      destroyWindow,
      focusOrShowNoteInNewWindow,
    };
  }, [
    windows,
    showNoteInNewWindow,
    showNoteInNewWindow,
    destroyWindow,
    focusOrShowNoteInNewWindow,
  ]);

  return (
    <NoteViewContext.Provider value={value}>
      {children}
    </NoteViewContext.Provider>
  );
};

export const useNoteWindow = () => {
  const value = React.useContext(NoteViewContext);
  if (!value) throw new Error("Outside Context.");
  return value;
};
