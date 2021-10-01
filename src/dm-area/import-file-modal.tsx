import * as React from "react";
import styled from "@emotion/styled/macro";
import graphql from "babel-plugin-relay/macro";
import { useMutation } from "relay-hooks";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import * as Button from "../button";
import { Modal } from "../modal";
import { useAsyncTask } from "../hooks/use-async-task";
import { sendRequest, ISendRequestTask } from "../http-request";
import { buildApiUrl } from "../public-url";
import { useAccessToken } from "../hooks/use-access-token";
import { LoadingSpinner } from "../loading-spinner";
import { AnimatedDotDotDot } from "../animated-dot-dot-dot";
import { generateSHA256FileHash } from "../crypto";
import { importFileModal_MapImageRequestUploadMutation } from "./__generated__/importFileModal_MapImageRequestUploadMutation.graphql";
import { importFileModal_MapCreateMutation } from "./__generated__/importFileModal_MapCreateMutation.graphql";

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

const ImportFileModal_MapImageRequestUploadMutation = graphql`
  mutation importFileModal_MapImageRequestUploadMutation(
    $input: MapImageRequestUploadInput!
  ) {
    mapImageRequestUpload(input: $input) {
      id
      uploadUrl
    }
  }
`;

const ImportFileModal_MapCreateMutation = graphql`
  mutation importFileModal_MapCreateMutation($input: MapCreateInput!) {
    mapCreate(input: $input) {
      ... on MapCreateSuccess {
        __typename
        createdMap {
          id
          title
          mapImageUrl
        }
      }
      ... on MapCreateError {
        __typename
        reason
      }
    }
  }
`;

const ImageImportModal: React.FC<{
  file: File;
  close: () => void;
}> = ({ file, close }) => {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
  const accessToken = useAccessToken();

  const [mapImageRequestUpload] =
    useMutation<importFileModal_MapImageRequestUploadMutation>(
      ImportFileModal_MapImageRequestUploadMutation
    );
  const [mapCreate] = useMutation<importFileModal_MapCreateMutation>(
    ImportFileModal_MapCreateMutation
  );

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
      const hash = await generateSHA256FileHash(file);
      // 1. request file upload
      const result = await mapImageRequestUpload({
        variables: {
          input: {
            sha256: hash,
            extension: file.name.split(".").pop() ?? "",
          },
        },
      });

      // 2. upload file
      const uploadResponse = await fetch(
        result.mapImageRequestUpload.uploadUrl,
        {
          method: "PUT",
          body: file,
        }
      );

      if (uploadResponse.status !== 200) {
        const body = await uploadResponse.text();
        throw new Error(
          "Received invalid response code: " +
            uploadResponse.status +
            "\n\n" +
            body
        );
      }

      // 3. create map
      await mapCreate({
        variables: {
          input: {
            title: file.name,
            mapImageUploadId: result.mapImageRequestUpload.id,
          },
        },
        onCompleted: () => {
          close();
        },
      });
    }, [file, fileTitleWithoutExtension, close])
  );

  const [isImportingMediaLibraryItem, onClickImportMediaLibraryItem] =
    useAsyncTask(
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

type ImportFileLogRecord = { type: "error" | "success"; message: string };

const NoteImportLogRow = styled.div`
  text-align: left;
  padding: 4px;
  background-color: black;
  color: white;
`;

const NoteImportLogFilter = styled.div`
  text-align: right;
  padding-top: 8px;
`;

const NoteImportLogRenderer = (props: {
  logs: ImportFileLogRecord[];
}): React.ReactElement => {
  const virtuosoRef = React.useRef<VirtuosoHandle | null>(null);

  const [filter, setFilter] = React.useState(
    "failure" as "none" | "success" | "failure"
  );

  const logs = React.useMemo(() => {
    switch (filter) {
      case "none":
        return props.logs;
      case "success":
        return props.logs.filter((log) => log.type === "success");
      case "failure":
        return props.logs.filter((log) => log.type === "error");
    }
  }, [props.logs, filter]);

  // TODO: Is there a better way to start the list at the end?
  React.useEffect(() => {
    setTimeout(() => virtuosoRef.current?.scrollToIndex(logs.length - 1));
  }, [logs]);

  return (
    <React.Fragment>
      <Virtuoso
        ref={virtuosoRef}
        initialTopMostItemIndex={props.logs.length - 1}
        followOutput={true}
        data={props.logs}
        itemContent={(_, logRow) => {
          return <NoteImportLogRow>{logRow.message}</NoteImportLogRow>;
        }}
      />
      <NoteImportLogFilter>
        <label>
          <strong>Filter </strong>
          <select
            value={filter}
            onChange={(ev) => {
              setFilter(ev.target.value as any);
            }}
          >
            <option value="none">All</option>
            <option value="success">Successful</option>
            <option value="failure">Failed</option>
          </select>
        </label>
      </NoteImportLogFilter>
    </React.Fragment>
  );
};

const NoteImportModal: React.FC<{ file: File; close: () => void }> = (
  props
) => {
  const [state, setState] = React.useState<
    "notStarted" | "inProgress" | "finished"
  >("notStarted");
  const [logs, setLogs] = React.useState([] as ImportFileLogRecord[]);
  const [importedFilesCount, setImportedFilesCount] = React.useState(0);
  const [failedFilesCount, setFailedFilesCount] = React.useState(0);
  const [showLogs, setShowLogs] = React.useState(false);

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
        Authorization: accessToken ? `Bearer ${accessToken}` : null,
      },
      onProgress: (data: string) => {
        const lines = data.split("\n").filter(Boolean);
        lines.forEach((line) => {
          const data = JSON.parse(line);
          if (data.latest.error) {
            setLogs((logs) => [
              ...logs,
              {
                type: "error",
                message: data.latest.error.message,
              },
            ]);
          } else {
            setLogs((logs) => [
              ...logs,
              {
                type: "success",
                message: data.latest.data.message,
              },
            ]);
          }
        });
        const lastLine = lines.pop();
        if (lastLine?.trim()) {
          const data = JSON.parse(lastLine.trim());
          if (data.amountOfImportedRecords) {
            setImportedFilesCount(data.amountOfImportedRecords);
          }
          if (data.amountOfFailedRecords) {
            setFailedFilesCount(data.amountOfFailedRecords);
          }
        }
      },
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
          <div style={{ textAlign: "center" }}>
            {state === "notStarted" ? (
              <h2>Preparing import</h2>
            ) : (
              <h2>
                Successfully imported {importedFilesCount} note
                {importedFilesCount === 1 ? "" : "s"}{" "}
                {failedFilesCount > 0 ? ` (${failedFilesCount} failed)` : null}
              </h2>
            )}
            {showLogs ? (
              <React.Fragment>
                <NoteImportLogRenderer logs={logs} />
              </React.Fragment>
            ) : (
              <React.Fragment>
                <FileTitle>File: {props.file.name}</FileTitle>
                <div
                  style={{
                    height: 200,
                    position: "relative",
                    marginTop: 12,
                  }}
                >
                  <LoadingSpinner state={state} />
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {state === "notStarted" ? null : importedFilesCount === 0 &&
                      state === "inProgress" ? (
                      <strong>
                        Uploading
                        <AnimatedDotDotDot />
                      </strong>
                    ) : state === "finished" ? (
                      <strong>Done.</strong>
                    ) : (
                      <strong>
                        Importing
                        <AnimatedDotDotDot />
                      </strong>
                    )}
                  </div>
                </div>
              </React.Fragment>
            )}
          </div>
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
                    {showLogs ? (
                      <Button.Primary onClick={() => setShowLogs(false)}>
                        Hide logs
                      </Button.Primary>
                    ) : (
                      <Button.Primary onClick={() => setShowLogs(true)}>
                        Show logs
                      </Button.Primary>
                    )}
                  </div>
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
}> = ({ file, close }) => {
  if (validImageFileTypes.includes(file.type)) {
    return <ImageImportModal file={file} close={close} />;
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
