import * as React from "react";

type ShowFileDialogFunction = () => void;
type OnSelectFileFunction = (file: File) => void;

export const useSelectFileDialog = (
  onSelect: OnSelectFileFunction
): [React.ReactNode, ShowFileDialogFunction] => {
  const ref = React.useRef<HTMLInputElement>(null);

  const onChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      if (!ev.currentTarget.files) return;
      const file = ev.currentTarget.files[0] as File | undefined;
      ev.currentTarget.value = "";
      if (file) {
        onSelect(file);
      }
    },
    [onSelect]
  );

  const node = React.useMemo(
    () => (
      <input
        type="file"
        accept=".jpeg,.jpg,.svg,.png"
        ref={ref}
        onChange={onChange}
        style={{ display: "none" }}
      />
    ),
    [onChange]
  );

  const showFileDialog = React.useCallback(() => {
    ref.current?.click();
  }, []);

  return [node, showFileDialog];
};
