import * as React from "react";
import useAsyncEffect from "@n1ru4l/use-async-effect";
import styled from "@emotion/styled/macro";
import { darken } from "polished";
import * as Icon from "../../feather-icons";
import * as Button from "../../button";
import { Modal } from "../../modal";
import { buildApiUrl } from "../../public-url";
import { sendRequest, ISendRequestTask } from "../../http-request";
import { useGetIsMounted } from "../../hooks/use-get-is-mounted";
import { useInvokeOnScrollEnd } from "../../hooks/use-invoke-on-scroll-end";

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

const ListItem = styled.button<{ isActive: boolean }>`
  border: none;
  display: block;
  width: calc(100% / 4);
  padding: 16px;
  text-align: center;
  margin-bottom: 16px;

  background-color: ${(p) => (p.isActive ? darken(0.1, "#fff") : "#fff")};
  font-weight: ${(p) => (p.isActive ? "bold" : "inherit")};
`;

const ListItemImage = styled.img`
  max-width: 100%;
  max-height: 150px;
`;

const ListItemTitle = styled.div`
  padding-top: 8px;
`;

type MediaLibraryItem = {
  id: string;
  path: string;
  title: string;
};

type SelectLibraryImageState =
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

type SelectLibraryImageAction =
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
  | { type: "SET_SELECTED_FILE_ID"; data: { selectedFileId: string } };

const stateReducer: React.Reducer<
  SelectLibraryImageState,
  SelectLibraryImageAction
> = (state, action) => {
  switch (action.type) {
    case "LOAD_INITIAL_RESULT": {
      return {
        ...state,
        mode: "LOADED",
        items: action.data.items,
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
    case "SET_SELECTED_FILE_ID": {
      return {
        ...state,
        selectedFileId: action.data.selectedFileId,
      };
    }
  }
};

const initialState: SelectLibraryImageState = {
  mode: "LOADING",
  items: null,
  selectedFileId: null,
};

export const SelectLibraryImageModal: React.FC<{
  close: () => void;
  onSelect: (mediaId: string) => void;
}> = ({ close, onSelect }) => {
  const [state, dispatch] = React.useReducer(stateReducer, initialState);
  const getIsMounted = useGetIsMounted();

  const selectedFile = React.useMemo(() => {
    if (state.mode === "LOADING") return null;
    return state.items.find((item) => item.id === state.selectedFileId) || null;
  }, [state]);

  useAsyncEffect(function* (onCancel, cast) {
    const task = sendRequest({
      method: "GET",
      headers: {},
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
      headers: {},
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

  const onScroll = useInvokeOnScrollEnd(
    React.useCallback(() => {
      if (state.mode === "LOADED") {
        fetchMore();
      }
    }, [state])
  );

  return (
    <Modal onClickOutside={close} onPressEscape={close}>
      <Content onClick={(ev) => ev.stopPropagation()} tabIndex={1}>
        <Modal.Header>
          <Modal.Heading2>
            <Icon.Image boxSize="28px" /> Media Library
          </Modal.Heading2>
        </Modal.Header>
        <Modal.Body
          style={{ flex: 1, overflowY: "scroll" }}
          onScroll={onScroll}
        >
          <Grid>
            {state.mode === "LOADING"
              ? null
              : state.items.map((item) => (
                  <ListItem
                    isActive={selectedFile === item}
                    key={item.id}
                    onClick={() =>
                      dispatch({
                        type: "SET_SELECTED_FILE_ID",
                        data: { selectedFileId: item.id },
                      })
                    }
                  >
                    <ListItemImage src={buildApiUrl(`/images/${item.id}`)} />
                    <ListItemTitle>{item.title}</ListItemTitle>
                  </ListItem>
                ))}
          </Grid>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <div>
                <Button.Tertiary onClick={close}>Abort</Button.Tertiary>
              </div>
              <div>
                <Button.Primary
                  disabled={selectedFile === null}
                  tabIndex={1}
                  onClick={() => selectedFile && onSelect(selectedFile.id)}
                >
                  Select Image
                </Button.Primary>
              </div>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Content>
    </Modal>
  );
};
