import * as React from "react";
import { Modal, ModalDialogSize } from "../../modal";
import * as Icon from "../../feather-icons";
import * as Button from "../../button";
import { ISendRequestTask, sendRequest } from "../../http-request";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import { buildApiUrl } from "../../public-url";
import { useGetIsMounted } from "../../hooks/use-get-is-mounted";
import { useInvokeOnScrollEnd } from "../../hooks/use-invoke-on-scroll-end";
import styled from "@emotion/styled/macro";
import { ImageLightBoxModal } from "../../image-lightbox-modal";
import { useShareImageAction } from "../../hooks/use-share-image-action";
import { useSplashShareImageAction } from "../../hooks/use-splash-share-image-action";
import { InputGroup } from "../../input";
import { useSelectFileDialog } from "../../hooks/use-select-file-dialog";
import { useAccessToken } from "../../hooks/use-access-token";

type MediaLibraryProps = {
  onClose: () => void;
};

type MediaLibraryItem = {
  id: string;
  path: string;
  title: string;
};

type MediaLibraryState =
  | {
      mode: "LOADING";
      items: null;
      selectedFileId: string | null;
    }
  | {
      mode: "LOADED";
      items: Array<MediaLibraryItem>;
      selectedFileId: string | null;
    }
  | {
      mode: "LOADING_MORE";
      items: Array<MediaLibraryItem>;
      selectedFileId: string | null;
    };

type MediaLibraryAction =
  | {
      type: "LOAD_INITIAL_RESULT";
      data: {
        items: Array<MediaLibraryItem>;
      };
    }
  | {
      type: "LOAD_MORE_RESULT";
      data: {
        items: Array<MediaLibraryItem>;
      };
    }
  | {
      type: "DELETE_ITEM_DONE";
      data: {
        deletedItemId: string;
      };
    }
  | {
      type: "UPDATE_ITEM_DONE";
      data: {
        item: MediaLibraryItem;
      };
    }
  | {
      type: "CREATE_ITEM_DONE";
      data: {
        item: MediaLibraryItem;
      };
    };

const stateReducer: React.Reducer<MediaLibraryState, MediaLibraryAction> = (
  state,
  action
) => {
  switch (action.type) {
    case "LOAD_INITIAL_RESULT": {
      return {
        ...state,
        mode: "LOADED",
        items: action.data.items,
      };
    }
    case "DELETE_ITEM_DONE": {
      if (state.mode === "LOADING") return state;
      return {
        ...state,
        items: state.items.filter(
          (item) => item.id !== action.data.deletedItemId
        ),
      };
    }
    case "LOAD_MORE_RESULT": {
      if (state.mode === "LOADING") return state;
      return {
        ...state,
        mode: "LOADED",
        items: [...state.items, ...action.data.items],
      };
    }
    case "UPDATE_ITEM_DONE": {
      if (state.mode === "LOADING") return state;
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.data.item.id ? action.data.item : item
        ),
      };
    }
    case "CREATE_ITEM_DONE": {
      if (state.mode === "LOADING") return state;
      return {
        ...state,
        items: [action.data.item, ...state.items],
      };
    }
  }
};

const initialState: MediaLibraryState = {
  mode: "LOADING",
  items: null,
  selectedFileId: null,
};

export const MediaLibrary: React.FC<MediaLibraryProps> = ({ onClose }) => {
  const [state, dispatch] = React.useReducer(stateReducer, initialState);
  const getIsMounted = useGetIsMounted();
  const accessToken = useAccessToken();

  useAsyncEffect(function* (onCancel, cast) {
    const task = sendRequest({
      method: "GET",
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : null,
      },
      url: buildApiUrl("/images"),
    });
    onCancel(task.abort);
    const result = yield* cast(task.done);
    if (result.type === "success") {
      const jsonResponse = JSON.parse(result.data);
      dispatch({
        type: "LOAD_INITIAL_RESULT",
        data: {
          items: jsonResponse.data.list,
        },
      });
    }
  }, []);

  const fetchMoreTask = React.useRef<ISendRequestTask | null>(null);
  React.useEffect(() => fetchMoreTask?.current?.abort, []);

  const fetchMore = React.useCallback(() => {
    if (state.mode !== "LOADED") return;
    fetchMoreTask.current?.abort();

    const task = sendRequest({
      method: "GET",
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : null,
      },
      url: buildApiUrl(`/images?offset=${state.items.length}`),
    });
    fetchMoreTask.current = task;

    task.done.then((result) => {
      if (getIsMounted() === false) return;
      if (result.type === "success") {
        const jsonResponse = JSON.parse(result.data);
        dispatch({
          type: "LOAD_MORE_RESULT",
          data: {
            items: jsonResponse.data.list,
          },
        });
      }
    });
  }, [state]);

  const deleteImageAction = React.useCallback((id: string) => {
    const task = sendRequest({
      method: "DELETE",
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : null,
      },
      url: buildApiUrl(`/images/${id}`),
    });

    task.done.then((result) => {
      if (getIsMounted() === false) return;
      if (result.type === "success") {
        const jsonResponse = JSON.parse(result.data);
        dispatch({
          type: "DELETE_ITEM_DONE",
          data: {
            deletedItemId: jsonResponse.data.deletedImageId,
          },
        });
      }
    });
  }, []);

  const updateImageAction = React.useCallback(
    (id: string, { title }: { title: string }) => {
      const task = sendRequest({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken ? `Bearer ${accessToken}` : null,
        },
        url: buildApiUrl(`/images/${id}`),
        body: JSON.stringify({
          title,
        }),
      });

      task.done.then((result) => {
        if (getIsMounted() === false) return;
        if (result.type === "success") {
          const jsonResponse = JSON.parse(result.data);
          dispatch({
            type: "UPDATE_ITEM_DONE",
            data: {
              item: jsonResponse.data.image,
            },
          });
        }
      });
    },
    []
  );

  const onScroll = useInvokeOnScrollEnd(
    React.useCallback(() => {
      if (state.mode === "LOADED") {
        fetchMore();
      }
    }, [state])
  );

  const [reactTreeNode, showSelectFileDialog] = useSelectFileDialog(
    React.useCallback((file) => {
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

      task.done.then((response) => {
        if (getIsMounted() === false) return;
        if (response.type === "success") {
          const result = JSON.parse(response.data);
          dispatch({
            type: "CREATE_ITEM_DONE",
            data: {
              item: result.data.item,
            },
          });
        }
      });
    }, [])
  );

  return (
    <Modal onClickOutside={onClose} onPressEscape={onClose}>
      <Content
        onClick={(ev) => ev.stopPropagation()}
        tabIndex={1}
        style={{ maxWidth: 1600 }}
      >
        <Modal.Header>
          <Modal.Heading2>
            <Icon.Image boxSize="28px" /> Media Library
          </Modal.Heading2>
          <div style={{ flex: 1, textAlign: "right" }}>
            <Button.Tertiary
              tabIndex={1}
              style={{ marginLeft: 8 }}
              onClick={onClose}
            >
              Close
            </Button.Tertiary>
          </div>
        </Modal.Header>
        <Modal.Body
          style={{ flex: 1, overflowY: "scroll" }}
          onScroll={onScroll}
        >
          <Grid>
            {state.mode === "LOADING"
              ? null
              : state.items.map((item) => (
                  <Item
                    item={item}
                    key={item.id}
                    deleteItem={() => deleteImageAction(item.id)}
                    updateItem={(opts) => updateImageAction(item.id, opts)}
                  />
                ))}
          </Grid>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <div>
                <Button.Primary onClick={showSelectFileDialog} role="button">
                  <Icon.Plus boxSize="24px" />
                  <span>Upload new File</span>
                </Button.Primary>
              </div>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
        {reactTreeNode}
      </Content>
    </Modal>
  );
};

const Item: React.FC<{
  item: MediaLibraryItem;
  deleteItem: () => void;
  updateItem: (opts: { title: string }) => void;
}> = ({ item, deleteItem, updateItem }) => {
  const [showLightboxImage, setShowLightBoxImage] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const shareImage = useShareImageAction();
  const splashShareImage = useSplashShareImageAction();

  return (
    <ListItem>
      <ListItemImageContainer onClick={() => setShowLightBoxImage(true)}>
        <ListItemImage src={buildApiUrl(`/images/${item.id}`)} />
      </ListItemImageContainer>
      <ListItemTitle>{item.title}</ListItemTitle>
      <Menu data-menu>
        <Button.Primary
          small
          title="Edit"
          iconOnly
          onClick={() => setShowEditModal(true)}
        >
          <Icon.Edit boxSize="16px" />
        </Button.Primary>
        <Button.Primary
          small
          title="Splash Share"
          iconOnly
          onClick={() => splashShareImage(item.id)}
        >
          <Icon.Share boxSize="16px" />
        </Button.Primary>
        <Button.Primary
          small
          title="Share To Chat"
          iconOnly
          onClick={() => shareImage(item.id)}
        >
          <Icon.MessageCircle boxSize="16px" />
        </Button.Primary>
        <Button.Primary
          small
          title="Maximize"
          iconOnly
          onClick={() => setShowLightBoxImage(true)}
        >
          <Icon.Maximize boxSize="16px" />
        </Button.Primary>
      </Menu>
      {showLightboxImage ? (
        <ImageLightBoxModal
          src={buildApiUrl(`/images/${item.id}`)}
          close={() => setShowLightBoxImage(false)}
        />
      ) : null}
      {showEditModal ? (
        <EditImageModal
          title={item.title}
          onClose={() => setShowEditModal(false)}
          onDelete={deleteItem}
          onConfirm={({ title }) => {
            updateItem({ title });
          }}
        />
      ) : null}
    </ListItem>
  );
};

const EditImageModal: React.FC<{
  title: string;
  onClose: () => void;
  onDelete: () => void;
  onConfirm: (opts: { title: string }) => void;
}> = ({ title, onClose, onConfirm, onDelete }) => {
  const [inputValue, setInputValue] = React.useState(title);

  const onChangeInputValue = React.useCallback(
    (ev) => {
      setInputValue(ev.target.value);
    },
    [setInputValue]
  );

  return (
    <Modal onClickOutside={onClose} onPressEscape={onClose}>
      <Modal.Dialog size={ModalDialogSize.SMALL}>
        <Modal.Header>
          <Modal.Heading3>Edit Image</Modal.Heading3>
        </Modal.Header>
        <Modal.Body>
          <InputGroup
            autoFocus
            placeholder="Map title"
            value={inputValue}
            onChange={onChangeInputValue}
            error={null}
          />
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup left>
              <div>
                <Button.Tertiary onClick={onDelete} type="button" danger>
                  <Icon.Trash boxSize="18px" />
                  <span>Delete</span>
                </Button.Tertiary>
              </div>
            </Modal.ActionGroup>
            <Modal.ActionGroup>
              <div>
                <Button.Tertiary onClick={onClose} type="button">
                  <span>Close</span>
                </Button.Tertiary>
              </div>
              <div>
                <Button.Primary
                  type="submit"
                  onClick={() => {
                    onClose();
                    onConfirm({ title: inputValue });
                  }}
                >
                  <span>Save</span>
                </Button.Primary>
              </div>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal>
  );
};

const Menu = styled.span`
  display: none;
  position: absolute;
  top: 0;
  right: 0;
  margin-top: 4px;
  margin-right: 4px;
  > * {
    margin-left: 8px;
  }
`;

const Content = styled.div`
  width: 90vw;
  height: 90vh;
  background-color: #fff;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
`;

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const ListItem = styled.div`
  position: relative;
  border: none;
  display: block;
  width: calc(100% / 4);
  padding: 16px;
  text-align: center;
  margin-bottom: 16px;

  background-color: #fff;

  &:hover [data-menu] {
    display: block;
  }
`;

const ListItemImageContainer = styled.button`
  display: block;
  border: none;
  background-color: transparent;
  height: 150px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: auto;
  margin-right: auto;
  cursor: pointer;
`;

const ListItemImage = styled.img`
  max-width: 100%;
  max-height: 150px;
`;

const ListItemTitle = styled.div`
  padding-top: 8px;
`;
