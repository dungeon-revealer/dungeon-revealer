import * as React from "react";
import uuid from "uuid/v4";
export { TokenInfoAside } from "./token-info-aside";

type NoteWindow = {
  id: string;
  currentIndex: number;
  history: string[];
};

type NoteWindowInterface = {
  windows: NoteWindow[];
};

type NoteWindowActions = {
  showNoteInWindow: (noteId: string, windowId: string) => void;
  showNoteInNewWindow: (noteId: string) => void;
  destroyWindow: (windowId: string) => void;
  focusOrShowNoteInNewWindow: (noteId: string) => void;
  focusWindow: (windowId: string) => void;
  navigateNext: (windowId: string) => void;
  navigateBack: (windowId: string) => void;
};

const NoteWindowContext = React.createContext<NoteWindowInterface | null>(null);
const NoteWindowActionsContext = React.createContext<NoteWindowActions | null>(
  null
);

export const NoteWindowContextProvider: React.FC<{}> = ({ children }) => {
  const [windows, setWindows] = React.useState([] as NoteWindow[]);

  const showNoteInNewWindow = React.useCallback((noteId: string) => {
    setWindows((windows) => [
      ...windows,
      { id: uuid(), currentIndex: 0, history: [noteId] },
    ]);
  }, []);

  const showNoteInWindow = React.useCallback(
    (noteId: string, windowId: string) => {
      setWindows((windows) => {
        const record = windows.find((window) => window.id === windowId);
        if (!record) {
          return [
            ...windows,
            { id: windowId, currentIndex: 0, history: [noteId] },
          ];
        }
        const newWindows = windows.filter((window) => window.id !== windowId);
        newWindows.push({
          id: record.id,
          currentIndex: record.currentIndex + 1,
          history: [
            ...record.history.slice(0, record.currentIndex + 1),
            noteId,
          ],
        });
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
      const record = windows.find(
        (window) => window.history[window.currentIndex] === noteId
      );
      if (!record) {
        return [...windows, { id: uuid(), currentIndex: 0, history: [noteId] }];
      }
      const newWindows = windows.filter(
        (window) => window.history[window.currentIndex] !== noteId
      );
      newWindows.push(record);
      return newWindows;
    });
  }, []);

  const focusWindow = React.useCallback((windowId: string) => {
    setWindows((windows) => {
      const record = windows.find((window) => window.id === windowId);
      if (!record) {
        return windows;
      }
      const newWindows = windows.filter((window) => window.id !== windowId);
      newWindows.push(record);
      return newWindows;
    });
  }, []);

  const navigateBack = React.useCallback((windowId: string) => {
    setWindows((windows) => {
      const record = windows.find((window) => window.id === windowId);
      if (!record || record.currentIndex === 0) {
        return windows;
      }
      const newWindows = windows.filter((window) => window.id !== windowId);
      newWindows.push({
        id: record.id,
        currentIndex: record.currentIndex - 1,
        history: record.history,
      });
      return newWindows;
    });
  }, []);

  const navigateNext = React.useCallback((windowId: string) => {
    setWindows((windows) => {
      const record = windows.find((window) => window.id === windowId);
      if (!record || record.currentIndex === record.history.length - 1) {
        return windows;
      }
      const newWindows = windows.filter((window) => window.id !== windowId);
      newWindows.push({
        id: record.id,
        currentIndex: record.currentIndex + 1,
        history: record.history,
      });
      return newWindows;
    });
  }, []);

  const value = React.useMemo(() => {
    return {
      showNoteInNewWindow,
      showNoteInWindow,
      destroyWindow,
      focusOrShowNoteInNewWindow,
      focusWindow,
      navigateNext,
      navigateBack,
    };
  }, [
    showNoteInNewWindow,
    showNoteInNewWindow,
    destroyWindow,
    focusOrShowNoteInNewWindow,
    focusWindow,
    navigateNext,
    navigateBack,
  ]);

  return (
    <NoteWindowActionsContext.Provider value={value}>
      <NoteWindowContext.Provider value={{ windows }}>
        {children}
      </NoteWindowContext.Provider>
    </NoteWindowActionsContext.Provider>
  );
};

export const useNoteWindows = () => {
  const value = React.useContext(NoteWindowContext);
  if (!value) throw new Error("Outside Context.");
  return value;
};

export const useNoteWindowActions = () => {
  const value = React.useContext(NoteWindowActionsContext);
  if (!value) throw new Error("Outside Context.");
  return value;
};
