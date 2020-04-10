import React, { useState, useCallback, useRef } from "react";

import { Modal, ModalDialogSize } from "./modal";
import * as Icons from "../feather-icons";
import { Input, InputGroup } from "../input";
import * as Button from "../button";
import * as ScrollableList from "./components/scrollable-list";
import { buildApiUrl } from "../public-url";

const CreateNewMapButton = ({ onSelectFile, children, ...props }) => {
  const fileInputRef = useRef();
  return (
    <>
      <Button.Primary
        {...props}
        onClick={() => {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
      >
        {children}
      </Button.Primary>
      <input
        type="file"
        style={{ display: "none" }}
        ref={fileInputRef}
        accept=".jpeg,.jpg,.svg,.png"
        onChange={(ev) => {
          if (!ev.target.files) {
            return;
          }
          const [file] = ev.target.files;
          if (!file) {
            return;
          }
          onSelectFile(file);
          ev.target.value = null;
        }}
      />
    </>
  );
};

const ModalType = {
  EDIT_TITLE: "EDIT_TITLE",
  DELETE_MAP: "DELETE_MAP",
  CREATE_MAP: "CREATE_MAP",
};

export const SelectMapModal = ({
  closeModal,
  setLoadedMapId,
  maps,
  liveMapId,
  loadedMapId,
  deleteMap,
  updateMap,
  createMap,
  canClose,
  enterGridMode,
  dmPassword,
}) => {
  const [activeMapId, setActiveMapId] = useState(loadedMapId);
  const [modalType, setModalType] = useState(null);
  const [filter, setFilterValue] = useState("");
  const selectedFileRef = useRef(null);

  const onChangeFilter = useCallback(
    (ev) => {
      setFilterValue(ev.target.value);
    },
    [setFilterValue]
  );

  let activeMap = null;
  if (activeMapId) {
    activeMap = maps.find((map) => map.id === activeMapId) || null;
  }

  const beforeCreateMap = (file) => {
    selectedFileRef.current = file;
    setModalType(ModalType.CREATE_MAP);
  };

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
              <Icons.MapIcon
                width={28}
                height={28}
                style={{ marginBottom: -2, marginRight: 16 }}
              />{" "}
              Map Library
            </Modal.Heading2>
            <div style={{ flex: 1, textAlign: "right" }}>
              {canClose ? (
                <Button.Tertiary
                  tabIndex="3"
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
                    tabIndex="1"
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
                        item.title.toLowerCase().includes(filter)
                    )
                    .map((item) => (
                      <ScrollableList.ListItem key={item.id}>
                        <ScrollableList.ListItemButton
                          tabIndex="1"
                          isActive={item.id === activeMapId}
                          onClick={() => {
                            setActiveMapId(item.id);
                          }}
                        >
                          {item.title} {item.id === liveMapId ? "(live)" : null}
                        </ScrollableList.ListItemButton>
                      </ScrollableList.ListItem>
                    ))}
                </ScrollableList.List>
                <Modal.Footer>
                  <CreateNewMapButton
                    tabIndex="1"
                    fullWidth
                    onSelectFile={(file) => {
                      beforeCreateMap(file);
                    }}
                  >
                    <Icons.PlusIcon height={20} width={20} />{" "}
                    <span>Create New Map</span>
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
                  }}
                >
                  <h3
                    style={{
                      margin: `1rem 16px 1rem 0`,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {activeMap.title}
                  </h3>
                  <Button.Tertiary
                    iconOnly
                    onClick={() => {
                      setModalType(ModalType.EDIT_TITLE);
                    }}
                  >
                    <Icons.EditIcon height={16} />
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
                      `/map/${activeMap.id}/map?authorization=${dmPassword}`
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
                      tabIndex="2"
                      onClick={() => {
                        setModalType(ModalType.DELETE_MAP);
                      }}
                    >
                      <Icons.TrashIcon height={20} width={20} />
                      <span>Delete</span>
                    </Button.Tertiary>
                  </div>
                  <div>
                    <Button.Tertiary
                      tabIndex="2"
                      onClick={() => {
                        enterGridMode(activeMap.id);
                      }}
                    >
                      <Icons.GridIcon height={20} width={20} />
                      <span>Grid</span>
                    </Button.Tertiary>
                  </div>

                  <div style={{ marginLeft: "auto" }}>
                    <Button.Primary
                      tabIndex="1"
                      onClick={() => {
                        setLoadedMapId(activeMap.id);
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
                      <Icons.MapIcon height={24} width={24} />
                      <span>Create a new Map</span>
                    </CreateNewMapButton>
                  </>
                )}
              </div>
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal>
      {modalType === ModalType.EDIT_TITLE ? (
        <ChangeMapTitleModal
          closeModal={() => setModalType(null)}
          updateMap={(...args) => updateMap(activeMapId, ...args)}
        />
      ) : modalType === ModalType.DELETE_MAP ? (
        <DeleteMapModal
          closeModal={() => setModalType(null)}
          deleteMap={() => deleteMap(activeMapId)}
        />
      ) : modalType === ModalType.CREATE_MAP ? (
        <CreateNewMapModal
          closeModal={() => {
            setModalType(null);
          }}
          createMap={(title) =>
            createMap({ file: selectedFileRef.current, title })
          }
        />
      ) : null}
    </>
  );
};

const CreateNewMapModal = ({ closeModal, createMap }) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  const onChangeInputValue = useCallback(
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
              <Button.Tertiary onClick={closeModal} type="button">
                Abort
              </Button.Tertiary>
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
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};

const ChangeMapTitleModal = ({ closeModal, updateMap }) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState(null);
  const onChangeInputValue = useCallback(
    (ev) => {
      setInputValue(ev.target.value);
    },
    [setInputValue]
  );
  const submit = useCallback(() => {
    if (inputValue.trim().length === 0) {
      setError("Please enter a map name.");
      return;
    }
    updateMap({ title: inputValue });
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
              <Button.Tertiary type="button" onClick={closeModal}>
                Abort
              </Button.Tertiary>
              <Button.Primary type="submit">Change Map Title</Button.Primary>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};

const DeleteMapModal = ({ closeModal, deleteMap }) => {
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
              <Button.Tertiary type="submit" onClick={closeModal}>
                Abort
              </Button.Tertiary>
              <Button.Primary
                type="button"
                onClick={() => {
                  deleteMap();
                  closeModal();
                }}
              >
                Delete
              </Button.Primary>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};
