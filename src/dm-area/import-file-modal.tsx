import * as React from "react";
import styled from "@emotion/styled/macro";
import * as Button from "../button";
import { Modal } from "../modal";
import { useAsyncTask } from "../hooks/use-async-task";
import { sendRequest, ISendRequestTask } from "../http-request";
import { buildApiUrl } from "../public-url";
import { useAccessToken } from "../hooks/use-access-token";
import throttle from "lodash/throttle";
import { LoadingSpinner } from "../loading-spinner";
import { AnimatedDotDotDot } from "../animated-dot-dot-dot";

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

const validImageFileTypes = ["image/png", "image/jpeg"];
const validNoteImportFileTypes = ["application/zip", "text/markdown"];

type CreateMapFunction = (opts: { file: File; title: string }) => Promise<void>;

const ImageImportModal: React.FC<{
  file: File;
  close: () => void;
  createMap: CreateMapFunction;
}> = ({ file, close, createMap }) => {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
  const accessToken = useAccessToken();

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
          Authorization: accessToken ? `Bearer ${accessToken}` : null,
        },
      });

      await task.done;
      close();
    }, [file, close, accessToken])
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

const NoteImportModal: React.FC<{ file: File; close: () => void }> = (
  props
) => {
  const [state, setState] = React.useState<
    "notStarted" | "inProgress" | "finished"
  >("notStarted");
  const [importedFilesCount, setImportedFilesCount] = React.useState(0);
  const accessToken = useAccessToken();
  const onClose = () => {
    if (state === "inProgress") {
      return;
    }
    props.close();
  };

  const request = React.useRef<ISendRequestTask | null>(null);

  React.useEffect(
    () => () => {
      request.current?.abort();
    },
    []
  );

  const onClickImport = () => {
    if (state === "inProgress") {
      return;
    }
    setState("inProgress");
    const data = new FormData();
    data.append("file", props.file);
    request.current = sendRequest({
      method: "POST",
      url: buildApiUrl("/notes/import"),
      body: data,
      headers: {
        Authentication: accessToken ? `Bearer ${accessToken}` : null,
      },
      onProgress: throttle((data: string) => {
        const lastLine = data.split("\n").pop();
        if (lastLine?.trim()) {
          const data = JSON.parse(lastLine.trim());
          if (data.amountOfImportedRecords) {
            setImportedFilesCount(data.amountOfImportedRecords);
          }
        }
      }, 100),
    });
    request.current.done.then(() => {
      setState("finished");
    });
  };

  return (
    <Modal onPressEscape={onClose} onClickOutside={onClose}>
      <Modal.Dialog>
        <Modal.Header>
          <h3>Import Notes</h3>
        </Modal.Header>
        <Modal.Body>
          {state === "inProgress" || state === "finished" ? (
            <div style={{ textAlign: "center" }}>
              <h2>
                Successfully imported {importedFilesCount} note
                {importedFilesCount === 1 ? "" : "s"}
              </h2>
              <FileTitle>Importing {props.file.name}</FileTitle>

              <div style={{ height: 200 }}>
                {state === "inProgress" ? <LoadingSpinner /> : null}
                {importedFilesCount === 0 && state !== "finished" ? (
                  <strong>
                    Uploading
                    <AnimatedDotDotDot />
                  </strong>
                ) : state === "finished" ? (
                  <div
                    style={{
                      display: "flex",
                      height: 200,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <strong>All notes have been imported.</strong>
                  </div>
                ) : (
                  <strong>
                    Importing
                    <AnimatedDotDotDot />
                  </strong>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <h2>Preparing import</h2>
              <FileTitle>Target: {props.file.name}</FileTitle>
              <div style={{ height: 200 }} />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            {state === "notStarted" ? (
              <>
                <Modal.ActionGroup>
                  <Button.Tertiary tabIndex={1} onClick={onClose}>
                    Close
                  </Button.Tertiary>
                </Modal.ActionGroup>
                <Modal.ActionGroup>
                  <div>
                    <Button.Primary onClick={onClickImport}>
                      Start Import
                    </Button.Primary>
                  </div>
                </Modal.ActionGroup>
              </>
            ) : state === "inProgress" ? (
              <>
                <Modal.ActionGroup>
                  <div>
                    <Button.Primary disabled>
                      {importedFilesCount === 0 ? "Uploading" : "Importing"}
                      <AnimatedDotDotDot />
                    </Button.Primary>
                  </div>
                </Modal.ActionGroup>
              </>
            ) : (
              <>
                <Modal.ActionGroup>
                  <div>
                    <Button.Primary onClick={onClose}>Close</Button.Primary>
                  </div>
                </Modal.ActionGroup>
              </>
            )}
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
  if (validImageFileTypes.includes(file.type)) {
    return <ImageImportModal file={file} close={close} createMap={createMap} />;
  } else if (validNoteImportFileTypes) {
    return <NoteImportModal file={file} close={close} />;
  } else {
    return (
      <Modal onPressEscape={close} onClickOutside={close}>
        <Modal.Dialog>
          <Modal.Header>
            <h3>Invalid File</h3>
          </Modal.Header>
          <Modal.Body>
            Only images, zip files and markdown files can imported into Dungeon
            Revealer.
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
