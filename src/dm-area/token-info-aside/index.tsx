import * as React from "react";
export { TokenInfoAside } from "./token-info-aside";
import { randomHash } from "../../utilities/random-hash";

type NoteWindow = {
  id: string;
  currentIndex: number;
  history: Array<string | null>;
  initialShowLibrary: boolean;
};

type NoteWindowInterface = {
  windows: NoteWindow[];
};

type NoteWindowActions = {
  showNoteInWindow: (
    noteId: string | null,
    windowId: string,
    initialShowLibrary?: boolean
  ) => void;
  showNoteInNewWindow: (noteId: string) => void;
  destroyWindow: (windowId: string) => void;
  focusOrShowNoteInNewWindow: (noteId: string) => void;
  focusWindow: (windowId: string) => void;
  navigateNext: (windowId: string) => void;
  navigateBack: (windowId: string) => void;
  replaceCurrent: (windowId: string, noteId: string | null) => void;
};

const NoteWindowContext = React.createContext<NoteWindowInterface | null>(null);
export const NoteWindowActionsContext =
  React.createContext<NoteWindowActions | null>(null);

export const NoteWindowContextProvider: React.FC<{}> = ({ children }) => {
  const [windows, setWindows] = React.useState([] as NoteWindow[]);

  const showNoteInNewWindow = React.useCallback(
    (noteId: string, initialShowLibrary: boolean = false) => {
      setWindows((windows) => [
        ...windows,
        {
          id: randomHash(),
          currentIndex: 0,
          history: [noteId],
          initialShowLibrary,
        },
      ]);
    },
    []
  );

  const showNoteInWindow = React.useCallback(
    (
      noteId: string | null,
      windowId: string,
      initialShowLibrary: boolean = false
    ) => {
      setWindows((windows) => {
        const record = windows.find((window) => window.id === windowId);
        if (!record) {
          return [
            ...windows,
            {
              id: windowId,
              currentIndex: 0,
              history: [noteId],
              initialShowLibrary,
            },
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
          initialShowLibrary,
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
        return [
          ...windows,
          {
            id: randomHash(),
            currentIndex: 0,
            history: [noteId],
            initialShowLibrary: false,
          },
        ];
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
        initialShowLibrary: false,
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
        initialShowLibrary: true,
      });
      return newWindows;
    });
  }, []);

  const replaceCurrent = React.useCallback(
    (windowId: string, noteId: string | null) => {
      setWindows((windows) => {
        let targetWindow = windows.find((window) => window.id === windowId);
        if (!targetWindow) {
          return windows;
        }
        let newCurrentIndex = targetWindow.currentIndex;
        const newHistory = targetWindow.history.slice(0);
        if (newCurrentIndex > 0 && noteId === null) {
          newCurrentIndex = newCurrentIndex - 1;
          newHistory.pop();
        } else {
          newHistory[targetWindow.currentIndex] = noteId;
        }

        targetWindow = {
          ...targetWindow,
          currentIndex: newCurrentIndex,
          history: newHistory,
        };

        return [
          ...windows.filter((window) => window.id !== windowId),
          targetWindow,
        ];
      });
    },
    []
  );

  const value = React.useMemo(() => {
    return {
      showNoteInNewWindow,
      showNoteInWindow,
      destroyWindow,
      focusOrShowNoteInNewWindow,
      focusWindow,
      navigateNext,
      navigateBack,
      replaceCurrent,
    };
  }, [
    showNoteInNewWindow,
    showNoteInNewWindow,
    destroyWindow,
    focusOrShowNoteInNewWindow,
    focusWindow,
    navigateNext,
    navigateBack,
    replaceCurrent,
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
