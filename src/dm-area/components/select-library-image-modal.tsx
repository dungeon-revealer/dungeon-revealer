import * as React from "react";
import styled from "@emotion/styled/macro";
import * as Icons from "../../feather-icons";
import * as Button from "../../button";
import { Modal } from "../../modal";
import { buildApiUrl } from "../../public-url";
import { sendRequest } from "../../http-request";
import { darken } from "polished";

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

const useInvokeOnScrollEnd = (action: () => void) => {
  return React.useCallback(
    ({ currentTarget }: React.UIEvent<HTMLElement>) => {
      const hasReachedBottom =
        currentTarget.scrollHeight - currentTarget.scrollTop ===
        currentTarget.clientHeight;
      if (hasReachedBottom) action();
    },
    [action]
  );
};

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

  const selectedFile = React.useMemo(() => {
    if (state.mode === "LOADING") return null;
    return state.items.find((item) => item.id === state.selectedFileId) || null;
  }, [state]);

  React.useEffect(() => {
    const task = sendRequest({
      method: "GET",
      headers: {},
      url: buildApiUrl("/images"),
    });

    task.done.then((result) => {
      if (result.type === "abort") return;
      if (result.type === "success") {
        const jsonResponse = JSON.parse(result.data);
        dispatch({
          type: "LOAD_INITIAL_RESULT",
          data: {
            items: jsonResponse.data.list,
          },
        });
      }
    });

    return task.abort;
  }, []);

  const fetchMore = React.useCallback(() => {
    if (state.mode !== "LOADED") return;
    const task = sendRequest({
      method: "GET",
      headers: {},
      url: buildApiUrl(`/images?offset=${state.items.length}`),
    });

    task.done.then((result) => {
      if (result.type === "abort") return;
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
            <Icons.MapIcon
              width={28}
              height={28}
              style={{ marginBottom: -2, marginRight: 16 }}
            />{" "}
            Media Library
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
              <Button.Tertiary onClick={close}>Abort</Button.Tertiary>
              <Button.Primary
                disabled={selectedFile === null}
                tabIndex={1}
                onClick={() => selectedFile && onSelect(selectedFile.id)}
              >
                Select Image
              </Button.Primary>
            </Modal.ActionGroup>
          </Modal.Actions>
        </Modal.Footer>
      </Content>
    </Modal>
  );
};
