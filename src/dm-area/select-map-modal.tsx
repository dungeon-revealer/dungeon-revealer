import * as React from "react";
import graphql from "babel-plugin-relay/macro";
import { useMutation, useQuery } from "relay-hooks";
import { ConnectionHandler } from "relay-runtime";
import { Modal, ModalDialogSize } from "../modal";
import * as Icons from "../feather-icons";
import { Input, InputGroup } from "../input";
import * as Button from "../button";
import * as ScrollableList from "./components/scrollable-list";
import { buildApiUrl } from "../public-url";
import { generateSHA256FileHash } from "../crypto";
import { useSelectFileDialog } from "../hooks/use-select-file-dialog";
import { selectMapModal_MapsQuery } from "./__generated__/selectMapModal_MapsQuery.graphql";
import { selectMapModal_MapCreateMutation } from "./__generated__/selectMapModal_MapCreateMutation.graphql";
import { selectMapModal_MapImageRequestUploadMutation } from "./__generated__/selectMapModal_MapImageRequestUploadMutation.graphql";
import { selectMapModal_MapDeleteMutation } from "./__generated__/selectMapModal_MapDeleteMutation.graphql";
import { selectMapModal_MapUpdateTitleMutation } from "./__generated__/selectMapModal_MapUpdateTitleMutation.graphql";

type CreateNewMapButtonProps = {
  children: React.ReactChild;
  onSelectFile: (file: File) => void;
} & Pick<
  React.ComponentProps<typeof Button.Primary>,
  "tabIndex" | "fullWidth" | "big"
>;

const CreateNewMapButton = ({
  onSelectFile,
  children,
  ...props
}: CreateNewMapButtonProps) => {
  const [reactTreeNode, showFileDialog] = useSelectFileDialog(onSelectFile);
  return (
    <>
      <Button.Primary {...props} onClick={showFileDialog}>
        {children}
      </Button.Primary>
      {reactTreeNode}
    </>
  );
};
enum ModalType {
  EDIT_TITLE = "EDIT_TITLE",
  DELETE_MAP = "DELETE_MAP",
  CREATE_MAP = "CREATE_MAP",
}

type ModalStates =
  | {
      type: ModalType.CREATE_MAP;
      data: {
        file: File;
      };
    }
  | {
      type: ModalType.DELETE_MAP;
      data: {
        mapId: string;
      };
    }
  | {
      type: ModalType.EDIT_TITLE;
      data: {
        mapId: string;
      };
    };

type SelectMapModalProps = {
  closeModal: () => void;
  setLoadedMapId: (id: string) => void;
  liveMapId: null | string;
  loadedMapId: null | string;
  canClose: boolean;
  dmPassword: string;
};

const SelectMapModal_MapsQuery = graphql`
  query selectMapModal_MapsQuery {
    maps {
      __id
      edges {
        node {
          id
          title
          mapImageUrl
        }
      }
    }
  }
`;

const SelectMapModal_MapImageRequestUploadMutation = graphql`
  mutation selectMapModal_MapImageRequestUploadMutation(
    $input: MapImageRequestUploadInput!
  ) {
    mapImageRequestUpload(input: $input) {
      id
      uploadUrl
    }
  }
`;

const SelectMapModal_MapCreateMutation = graphql`
  mutation selectMapModal_MapCreateMutation($input: MapCreateInput!) {
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

const SelectMapModal_MapDeleteMutation = graphql`
  mutation selectMapModal_MapDeleteMutation($input: MapDeleteInput!) {
    mapDelete(input: $input)
  }
`;

const SelectMapModal_MapUpdateTitleMutation = graphql`
  mutation selectMapModal_MapUpdateTitleMutation($input: MapUpdateTitleInput!) {
    mapUpdateTitle(input: $input) {
      updatedMap {
        id
        title
      }
    }
  }
`;

export const SelectMapModal = ({
  closeModal,
  setLoadedMapId,
  liveMapId,
  loadedMapId,
  canClose,
  dmPassword,
}: SelectMapModalProps) => {
  const [activeMapId, setActiveMapId] = React.useState(loadedMapId);
  const [modalState, setModalState] = React.useState<ModalStates | null>(null);
  const [filter, setFilterValue] = React.useState("");

  const response = useQuery<selectMapModal_MapsQuery>(SelectMapModal_MapsQuery);
  const [mapImageRequestUpload] =
    useMutation<selectMapModal_MapImageRequestUploadMutation>(
      SelectMapModal_MapImageRequestUploadMutation
    );
  const [mapCreate] = useMutation<selectMapModal_MapCreateMutation>(
    SelectMapModal_MapCreateMutation
  );
  const [mapDelete] = useMutation<selectMapModal_MapDeleteMutation>(
    SelectMapModal_MapDeleteMutation
  );
  const [mapUpdateTitle] = useMutation<selectMapModal_MapUpdateTitleMutation>(
    SelectMapModal_MapUpdateTitleMutation
  );

  const onChangeFilter = React.useCallback(
    (ev) => {
      setFilterValue(ev.target.value);
    },
    [setFilterValue]
  );

  const maps = response.data?.maps.edges ?? [];

  const activeMap = React.useMemo(
    () =>
      activeMapId
        ? maps.find((map) => map.node.id === activeMapId) || null
        : null,
    [activeMapId, maps]
  );

  const beforeCreateMap = React.useCallback((file) => {
    setModalState({ type: ModalType.CREATE_MAP, data: { file } });
  }, []);

  const closeIfPossible = React.useCallback(() => {
    if (!canClose) {
      return;
    }
    closeModal();
  }, [closeModal, canClose]);

  return (
    <>
      <Modal onClickOutside={closeIfPossible} onPressEscape={closeIfPossible}>
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading2>
              <Icons.MapIcon size={28} /> Map Library
            </Modal.Heading2>
            <div style={{ flex: 1, textAlign: "right" }}>
              {canClose ? (
                <Button.Tertiary
                  tabIndex={1}
                  style={{ marginLeft: 8 }}
                  onClick={closeModal}
                >
                  Close
                </Button.Tertiary>
              ) : null}
            </div>
          </Modal.Header>
          <Modal.Body style={{ display: "flex", height: "80vh" }} noPadding>
            {maps.length ? (
              <Modal.Aside>
                <div
                  style={{
                    paddingLeft: 12,
                    paddingRight: 12,
                    paddingTop: 10,
                    paddingBottom: 10,
                  }}
                >
                  <Input
                    tabIndex={1}
                    placeholder="Filter"
                    value={filter}
                    onChange={onChangeFilter}
                    onKeyDown={(ev) => {
                      if (ev.keyCode === 27 && filter !== "") {
                        ev.stopPropagation();
                        setFilterValue("");
                      }
                    }}
                  />
                </div>
                <ScrollableList.List>
                  {maps
                    .filter(
                      (item) =>
                        filter === "" ||
                        item.node.title.toLowerCase().includes(filter)
                    )
                    .map((item) => (
                      <ScrollableList.ListItem key={item.node.id}>
                        <ScrollableList.ListItemButton
                          tabIndex={1}
                          isActive={item.node.id === activeMapId}
                          onClick={() => {
                            setActiveMapId(item.node.id);
                          }}
                        >
                          {item.node.title}{" "}
                          {item.node.id === liveMapId ? "(live)" : null}
                        </ScrollableList.ListItemButton>
                      </ScrollableList.ListItem>
                    ))}
                </ScrollableList.List>
                <Modal.Footer>
                  <CreateNewMapButton
                    tabIndex={1}
                    fullWidth
                    onSelectFile={(file) => {
                      beforeCreateMap(file);
                    }}
                  >
                    <>
                      <Icons.PlusIcon height={20} width={20} />{" "}
                      <span>Create New Map</span>
                    </>
                  </CreateNewMapButton>
                </Modal.Footer>
              </Modal.Aside>
            ) : null}
            {activeMap ? (
              <Modal.Content>
                <div
                  style={{
                    display: "flex",
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingTop: 8,
                    paddingBottom: 16,
                    alignItems: "center",
                  }}
                >
                  <h3
                    style={{
                      margin: `0.5rem 16px 0.5rem 0`,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {activeMap.node.title}
                  </h3>
                  <Button.Tertiary
                    iconOnly
                    small
                    onClick={() => {
                      setModalState({
                        type: ModalType.EDIT_TITLE,
                        data: { mapId: activeMap.node.id },
                      });
                    }}
                  >
                    <Icons.EditIcon size={16} />
                  </Button.Tertiary>
                </div>
                <div
                  style={{
                    height: "100%",
                    width: "100%",
                    overflowY: "scroll",
                  }}
                >
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img
                    src={buildApiUrl(
                      // prettier-ignore
                      `/map/${activeMap.node.id}/map?authorization=${encodeURIComponent(dmPassword)}`
                    )}
                    style={{ width: "100%" }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingTop: 20,
                    paddingBottom: 16,
                  }}
                >
                  <div>
                    <Button.Tertiary
                      tabIndex={2}
                      onClick={() => {
                        setModalState({
                          type: ModalType.DELETE_MAP,
                          data: { mapId: activeMap.node.id },
                        });
                      }}
                    >
                      <Icons.TrashIcon size={20} />
                      <span>Delete</span>
                    </Button.Tertiary>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <Button.Primary
                      tabIndex={1}
                      onClick={() => {
                        setLoadedMapId(activeMap.node.id);
                      }}
                    >
                      <Icons.CheckIcon height={20} width={20} />
                      <span>Load Map</span>
                    </Button.Primary>
                  </div>
                </div>
              </Modal.Content>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  paddingLeft: 16,
                  paddingRight: 16,
                  paddingTop: 8,
                  paddingBottom: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  flexDirection: "column",
                }}
              >
                {maps.length ? (
                  <>
                    <Icons.Inbox height={75} width={75} fill="#D9E2EC" />
                    <h3>Please select a Map from the list on the left.</h3>
                  </>
                ) : (
                  <>
                    <Icons.Inbox height={75} width={75} fill="#D9E2EC" />
                    <h3 style={{ marginBottom: 20 }}>
                      Your library is currently empty
                    </h3>
                    <CreateNewMapButton
                      big
                      onSelectFile={(file) => {
                        beforeCreateMap(file);
                      }}
                    >
                      <>
                        <Icons.MapIcon size={24} />
                        <span>Create a new Map</span>
                      </>
                    </CreateNewMapButton>
                  </>
                )}
              </div>
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal>
      {modalState ? (
        modalState.type === ModalType.EDIT_TITLE ? (
          <ChangeMapTitleModal
            closeModal={() => setModalState(null)}
            updateMapTitle={(newTitle) =>
              mapUpdateTitle({
                variables: {
                  input: {
                    mapId: modalState.data.mapId,
                    newTitle,
                  },
                },
              })
            }
          />
        ) : modalState.type === ModalType.DELETE_MAP ? (
          <DeleteMapModal
            closeModal={() => setModalState(null)}
            deleteMap={() =>
              mapDelete({
                variables: {
                  input: {
                    mapId: modalState.data.mapId,
                  },
                },
                updater: (store) => {
                  const mapsConnection = store.get(response.data!.maps.__id);
                  if (mapsConnection == null) {
                    return;
                  }
                  ConnectionHandler.deleteNode(
                    mapsConnection,
                    modalState.data.mapId
                  );
                },
                onCompleted: () => {
                  setModalState(null);
                },
              })
            }
          />
        ) : modalState.type === ModalType.CREATE_MAP ? (
          <CreateNewMapModal
            closeModal={() => {
              setModalState(null);
            }}
            file={modalState.data.file}
            createMap={async (title) => {
              const hash = await generateSHA256FileHash(modalState.data.file);
              // 1. request file upload
              const result = await mapImageRequestUpload({
                variables: {
                  input: {
                    sha256: hash,
                    extension: modalState.data.file.name.split(".").pop() ?? "",
                  },
                },
              });

              // 2. upload file
              const uploadResponse = await fetch(
                result.mapImageRequestUpload.uploadUrl,
                {
                  method: "PUT",
                  body: modalState.data.file,
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
                    title,
                    mapImageUploadId: result.mapImageRequestUpload.id,
                  },
                },
                updater: (store, result) => {
                  if (result.mapCreate.__typename !== "MapCreateSuccess") {
                    return;
                  }

                  const mapsConnection = store.get(response.data!.maps.__id);
                  if (mapsConnection == null) {
                    return;
                  }

                  const createdMap = store.get(result.mapCreate.createdMap.id);

                  if (createdMap == null) {
                    return;
                  }

                  const edge = ConnectionHandler.createEdge(
                    store,
                    mapsConnection,
                    createdMap,
                    "Map"
                  );

                  ConnectionHandler.insertEdgeAfter(mapsConnection, edge);
                },
                onCompleted: (response) => {
                  if (response.mapCreate.__typename === "MapCreateSuccess") {
                    setActiveMapId(response.mapCreate.createdMap.id);
                  }
                },
              });

              setModalState(null);
            }}
          />
        ) : null
      ) : null}
    </>
  );
};

const extractDefaultTitleFromFileName = (fileName: string) => {
  const parts = fileName.split(".");
  if (parts.length < 2) return fileName;
  parts.pop();
  return parts.join(".");
};

const CreateNewMapModal = ({
  closeModal,
  file,
  createMap,
}: {
  closeModal: () => void;
  file: File;
  createMap: (title: string) => void;
}) => {
  const [inputValue, setInputValue] = React.useState(() =>
    extractDefaultTitleFromFileName(file.name)
  );
  const [error, setError] = React.useState<string | null>("");

  const onChangeInputValue = React.useCallback(
    (ev) => {
      setInputValue(ev.target.value);
      setError(null);
    },
    [setInputValue, setError]
  );

  return (
    <Modal onClickOutside={closeModal} onPressEscape={closeModal}>
      <Modal.Dialog size={ModalDialogSize.SMALL}>
        <Modal.Header>
          <Modal.Heading3>Create new Map</Modal.Heading3>
        </Modal.Header>
        <Modal.Body>
          <InputGroup
            autoFocus
            placeholder="Map title"
            value={inputValue}
            onChange={onChangeInputValue}
            error={error}
          />
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <div>
                <Button.Tertiary onClick={closeModal} type="button">
                  Abort
                </Button.Tertiary>
              </div>
              <div>
                <Button.Primary
                  type="submit"
                  onClick={() => {
                    if (inputValue.trim().length === 0) {
                      setError("Please enter a map name.");
                      return;
                    }
                    createMap(inputValue);
                    closeModal();
                  }}
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

const ChangeMapTitleModal: React.FC<{
  closeModal: () => void;
  updateMapTitle: (newTitle: string) => void;
}> = ({ closeModal, updateMapTitle: updateMap }) => {
  const [inputValue, setInputValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const onChangeInputValue = React.useCallback(
    (ev) => {
      setInputValue(ev.target.value);
    },
    [setInputValue]
  );
  const submit = React.useCallback(() => {
    if (inputValue.trim().length === 0) {
      setError("Please enter a map name.");
      return;
    }
    updateMap(inputValue);
    closeModal();
  }, [inputValue, closeModal, updateMap, setError]);

  return (
    <Modal onClickOutside={closeModal} onPressEscape={closeModal}>
      <Modal.Dialog size={ModalDialogSize.SMALL} onSubmit={submit}>
        <Modal.Header>
          <Modal.Heading3>Change Title</Modal.Heading3>
        </Modal.Header>

        <Modal.Body>
          <InputGroup
            autoFocus
            placeholder="New Map title"
            value={inputValue}
            onChange={onChangeInputValue}
            error={error}
          />
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <div>
                <Button.Tertiary type="button" onClick={closeModal}>
                  Abort
                </Button.Tertiary>
              </div>
              <div>
                <Button.Primary type="submit">Change Map Title</Button.Primary>
              </div>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};

const DeleteMapModal: React.FC<{
  closeModal: () => void;
  deleteMap: () => void;
}> = ({ closeModal, deleteMap }) => {
  return (
    <Modal onClickOutside={closeModal} onPressEscape={closeModal}>
      <Modal.Dialog size={ModalDialogSize.SMALL}>
        <Modal.Header>
          <Modal.Heading3>Delete Map</Modal.Heading3>
        </Modal.Header>
        <Modal.Body>Do you really want to delete this map?</Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <div>
                <Button.Tertiary type="submit" onClick={closeModal}>
                  Abort
                </Button.Tertiary>
              </div>
              <div>
                <Button.Primary
                  type="button"
                  onClick={() => {
                    deleteMap();
                  }}
                >
                  Delete
                </Button.Primary>
              </div>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};
