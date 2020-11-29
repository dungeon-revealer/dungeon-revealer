import * as React from "react";

interface ClipboardItem {
  new (input: { [contentType: string]: Blob }): ClipboardItem;
}

type AsyncClipboardWriteFunction = (
  input: Array<ClipboardItem>
) => Promise<void>;

declare global {
  interface Window {
    ClipboardItem: ClipboardItem | undefined;
  }

  interface Clipboard {
    write?: AsyncClipboardWriteFunction;
  }
}

interface AsyncClipboard extends Clipboard {
  write: AsyncClipboardWriteFunction;
}

type ClipboardApi = {
  clipboard: AsyncClipboard;
  ClipboardItem: ClipboardItem;
};

export const getAsyncClipboardApi: () => ClipboardApi | null = () => {
  if (
    typeof window === "undefined" ||
    typeof window.navigator.clipboard === "undefined" ||
    typeof window.navigator.clipboard.write === "undefined" ||
    typeof window.ClipboardItem === "undefined"
  ) {
    return null;
  }
  return {
    ClipboardItem: window.ClipboardItem,
    clipboard: navigator.clipboard as AsyncClipboard,
  };
};

/**
 * React hook for feature detecting the AsyncClipboard API which allows copying blobs to the clipboard.
 * learn more here: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write
 */
export const useAsyncClipboardApi = () => {
  const api = React.useMemo(() => getAsyncClipboardApi(), []);
  return api;
};
