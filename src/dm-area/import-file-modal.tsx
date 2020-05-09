import * as React from "react";
import styled from "@emotion/styled/macro";
import * as Button from "../button";
import { Modal } from "../modal";
import { useAsyncTask } from "../hooks/use-async-task";
import { useOvermind } from "../hooks/use-overmind";
import { sendRequest } from "../http-request";
import { buildApiUrl } from "../public-url";

const OrSeperator = styled.span`
  padding-left: 18px;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
`;

const PreviewImage = styled.img`
  margin-left: auto;
  margin-right: auto;
  display: block;
  height: 50vh;
  width: auto;
`;

const FileTitle = styled.div`
  text-align: center;
  font-weight: bold;
  margin-top: 8px;
`;

const extractDefaultTitleFromFileName = (fileName: string) => {
  const parts = fileName.split(".");
  if (parts.length < 2) return fileName;
  parts.pop();
  return parts.join(".");
};

const validFileTypes = ["image/png", "image/jpeg"];

type CreateMapFunction = (opts: { file: File; title: string }) => Promise<void>;

const ValidFileModal: React.FC<{
  file: File;
  close: () => void;
  createMap: CreateMapFunction;
}> = ({ file, close, createMap }) => {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
  const { state } = useOvermind();

  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setObjectUrl(objectUrl);

    return () => {
      setObjectUrl(null);
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const fileTitleWithoutExtension = React.useMemo(
    () => extractDefaultTitleFromFileName(file.name),
    [file]
  );

  const [isCreatingMap, onClickCreateMap] = useAsyncTask(
    React.useCallback(async () => {
      await createMap({
        file,
        title: fileTitleWithoutExtension,
      });
      close();
    }, [file, fileTitleWithoutExtension, close])
  );

  const [
    isImportingMediaLibraryItem,
    onClickImportMediaLibraryItem,
  ] = useAsyncTask(
    React.useCallback(async () => {
      const formData = new FormData();
      formData.append("file", file);

      const task = sendRequest({
        url: buildApiUrl("/images"),
        method: "POST",
        body: formData,
        headers: {
          Authorization: state.sessionStore.accessToken
            ? `Bearer ${state.sessionStore.accessToken}`
            : null,
        },
      });

      await task.done;
      close();
    }, [file, close])
  );

  const areButtonsDisabled = isImportingMediaLibraryItem || isCreatingMap;

  return (
    <Modal onPressEscape={close} onClickOutside={close}>
      <Modal.Dialog>
        <Modal.Header>
          <h3>Import Image</h3>
        </Modal.Header>
        <Modal.Body>
          {objectUrl ? <PreviewImage src={objectUrl} /> : null}
          <FileTitle>{fileTitleWithoutExtension}</FileTitle>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <Button.Tertiary tabIndex={1} onClick={close}>
                Close
              </Button.Tertiary>
            </Modal.ActionGroup>
            <Modal.ActionGroup>
              <div>
                <Button.Primary
                  disabled={areButtonsDisabled}
                  onClick={onClickImportMediaLibraryItem}
                >
                  Import into Media Library
                </Button.Primary>
              </div>
              <OrSeperator>or</OrSeperator>
              <div>
                <Button.Primary
                  disabled={areButtonsDisabled}
                  onClick={onClickCreateMap}
                >
                  Create Map
                </Button.Primary>
              </div>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};

export const ImportFileModal: React.FC<{
  file: File;
  close: () => void;
  createMap: CreateMapFunction;
}> = ({ file, close, createMap }) => {
  if (validFileTypes.includes(file.type)) {
    return <ValidFileModal file={file} close={close} createMap={createMap} />;
  } else {
    return (
      <Modal onPressEscape={close} onClickOutside={close}>
        <Modal.Dialog>
          <Modal.Header>
            <h3>Invalid File</h3>
          </Modal.Header>
          <Modal.Body>
            Only images can imported into Dungeon Revealer.
          </Modal.Body>
          <Modal.Footer>
            <Modal.Actions>
              <Modal.ActionGroup>
                <div>
                  <Button.Primary tabIndex={1} onClick={close}>
                    Ok
                  </Button.Primary>
                </div>
              </Modal.ActionGroup>
            </Modal.Actions>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal>
    );
  }
};
