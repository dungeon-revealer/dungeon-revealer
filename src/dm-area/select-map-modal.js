import React, { useState, useCallback, useRef } from "react";
import styled from "@emotion/styled/macro";
import { Modal, ModalDialogSize } from "./modal";
import * as Icons from "../feather-icons";
import { Input } from "../input";
import * as Button from "../button";

const MapListItemButton = styled.button`
  font-weight: bold;
  display: block;
  width: 100%;
  border: none;
  text-align: left;
  padding: 20px;
  cursor: pointer;
  text-decoration: none;
  padding-left: 13px;
  padding-right: 20px;
  background-color: ${p =>
    p.isActive ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 1)"};
  color: ${p => (p.isActive ? "#044e54" : "rgba(148, 160, 175, 1)")};

  &:focus,
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
    color: #044e54;
  }

  border-left: ${p =>
    p.isActive ? "7px solid #BCCCDC" : "7px solid transparent"};

  outline: none;
`;

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
        onChange={ev => {
          if (!ev.target.files) {
            return;
          }
          const [file] = ev.target.files;
          if (!file) {
            return;
          }
          onSelectFile(file);
        }}
      />
    </>
  );
};

const ModalType = {
  EDIT_TITLE: "EDIT_TITLE",
  DELETE_MAP: "DELETE_MAP",
  CREATE_MAP: "CREATE_MAP"
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
  canClose
}) => {
  const [activeMapId, setActiveMapId] = useState(loadedMapId);
  const [modalType, setModalType] = useState(null);
  const [filter, setFilterValue] = useState("");
  const selectedFileRef = useRef(null);

  const onChangeFilter = useCallback(
    ev => {
      setFilterValue(ev.target.value);
    },
    [setFilterValue]
  );

  let activeMap = null;
  if (activeMapId) {
    activeMap = maps.find(map => map.id === activeMapId) || null;
  }

  const beforeCreateMap = file => {
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
          <Modal.Header style={{ display: "flex", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>
              <Icons.MapIcon
                width={28}
                height={28}
                style={{ marginBottom: -2, marginRight: 16 }}
              />{" "}
              Map Library
            </h2>
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "scroll",
                  maxWidth: "30%",
                  width: "100%",
                  borderRight: "1px solid rgba(0,0,0,.1)"
                }}
              >
                <div
                  style={{
                    paddingLeft: 12,
                    paddingRight: 12,
                    paddingTop: 10,
                    paddingBottom: 10
                  }}
                >
                  <Input
                    tabIndex="1"
                    placeholder="Filter"
                    value={filter}
                    onChange={onChangeFilter}
                    onKeyDown={ev => {
                      if (ev.keyCode === 27 && filter !== "") {
                        ev.stopPropagation();
                        setFilterValue("");
                      }
                    }}
                  />
                </div>
                <ul
                  style={{
                    padding: 0,
                    listStyle: "none",
                    flex: 1,
                    overflowY: "scroll",
                    marginBottom: 0
                  }}
                >
                  {maps
                    .filter(
                      item => filter === "" || item.title.includes(filter)
                    )
                    .map(item => (
                      <li key={item.id}>
                        <MapListItemButton
                          tabIndex="1"
                          isActive={item.id === activeMapId}
                          onClick={() => {
                            setActiveMapId(item.id);
                          }}
                        >
                          {item.title} {item.id === liveMapId ? "(live)" : null}
                        </MapListItemButton>
                      </li>
                    ))}
                </ul>
                <div
                  style={{
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingBottom: 16,
                    display: "flex",
                    justifyContent: "flex-end",
                    paddingTop: 20,
                    borderTop: "1px solid rgba(0,0,0,.1)"
                  }}
                >
                  <CreateNewMapButton
                    tabIndex="1"
                    fullWidth
                    onSelectFile={file => {
                      beforeCreateMap(file);
                    }}
                  >
                    <Icons.PlusIcon height={20} width={20} /> Create New Map
                  </CreateNewMapButton>
                </div>
              </div>
            ) : null}
            {activeMap ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  width: "100%"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingTop: 8,
                    paddingBottom: 16
                  }}
                >
                  <h3
                    style={{
                      margin: `1rem 16px 1rem 0`
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
                    overflowY: "scroll"
                  }}
                >
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img
                    src={`/map/${activeMap.id}/map`}
                    style={{ width: "100%" }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingTop: 20,
                    paddingBottom: 16
                  }}
                >
                  <div>
                    <Button.Tertiary
                      tabIndex="2"
                      onClick={() => {
                        setModalType(ModalType.DELETE_MAP);
                      }}
                    >
                      <Icons.TrashIcon height={20} width={20} /> Delete
                    </Button.Tertiary>
                  </div>

                  <div style={{ marginLeft: "auto" }}>
                    <Button.Primary
                      tabIndex="1"
                      onClick={() => {
                        setLoadedMapId(activeMap.id);
                      }}
                    >
                      <Icons.CheckIcon height={20} width={20} /> Load Map
                    </Button.Primary>
                  </div>
                </div>
              </div>
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
                  flexDirection: "column"
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
                      onSelectFile={file => {
                        beforeCreateMap(file);
                      }}
                    >
                      <Icons.MapIcon height={24} width={24} /> Create a new Map
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
          createMap={title =>
            createMap({ file: selectedFileRef.current, title })
          }
        />
      ) : null}
    </>
  );
};

const CreateNewMapModal = ({ closeModal, createMap }) => {
  const [inputValue, setInputValue] = useState("");
  const onChangeInputValue = useCallback(
    ev => {
      setInputValue(ev.target.value);
    },
    [setInputValue]
  );

  return (
    <Modal onClickOutside={closeModal} onPressEscape={closeModal}>
      <Modal.Dialog size={ModalDialogSize.SMALL}>
        <Modal.Header>
          <h3 style={{ margin: 0 }}>Create new Map</h3>
        </Modal.Header>
        <Modal.Body>
          <Input
            placeholder="Map title"
            value={inputValue}
            onChange={onChangeInputValue}
          />
        </Modal.Body>
        <Modal.Actions>
          <Modal.ActionGroup>
            <Button.Tertiary onClick={closeModal}>Abort</Button.Tertiary>
            <Button.Primary
              onClick={() => {
                createMap(inputValue);
                closeModal();
              }}
            >
              Create Map
            </Button.Primary>
          </Modal.ActionGroup>
        </Modal.Actions>
      </Modal.Dialog>
    </Modal>
  );
};

const ChangeMapTitleModal = ({ closeModal, updateMap }) => {
  const [inputValue, setInputValue] = useState("");
  const onChangeInputValue = useCallback(
    ev => {
      setInputValue(ev.target.value);
    },
    [setInputValue]
  );
  return (
    <Modal onClickOutside={closeModal} onPressEscape={closeModal}>
      <Modal.Dialog size={ModalDialogSize.SMALL}>
        <Modal.Header>
          <h3>Change Title</h3>
        </Modal.Header>

        <Modal.Body>
          <Input
            placeholder="New Map title"
            value={inputValue}
            onChange={onChangeInputValue}
          />
        </Modal.Body>
        <Modal.Actions>
          <Modal.ActionGroup>
            <Button.Tertiary onClick={closeModal}>Abort</Button.Tertiary>
            <Button.Primary
              onClick={() => {
                updateMap({ title: inputValue });
                closeModal();
              }}
            >
              Change Map Title
            </Button.Primary>
          </Modal.ActionGroup>
        </Modal.Actions>
      </Modal.Dialog>
    </Modal>
  );
};

const DeleteMapModal = ({ closeModal, deleteMap }) => {
  return (
    <Modal onClickOutside={closeModal} onPressEscape={closeModal}>
      <Modal.Dialog size={ModalDialogSize.SMALL}>
        <Modal.Header>
          <h3 style={{ margin: 0 }}>Delete Map</h3>
        </Modal.Header>

        <Modal.Body>Do you really want to delete this map?</Modal.Body>
        <Modal.Actions>
          <Modal.ActionGroup>
            <Button.Tertiary onClick={closeModal}>Abort</Button.Tertiary>
            <Button.Primary
              onClick={() => {
                deleteMap();
                closeModal();
              }}
            >
              Delete
            </Button.Primary>
          </Modal.ActionGroup>
        </Modal.Actions>
      </Modal.Dialog>
    </Modal>
  );
};
