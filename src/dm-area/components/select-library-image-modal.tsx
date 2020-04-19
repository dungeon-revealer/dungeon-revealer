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

export const SelectLibrarayImageModal: React.FC<{
  close: () => void;
  onSelect: (mediaId: string) => void;
}> = ({ close, onSelect }) => {
  const [list, setListItems] = React.useState<
    { id: string; path: string; title: string }[] | null
  >();
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);

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
        setListItems(jsonResponse.data.list);
      }
    });

    return task.abort;
  }, []);

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
        <Modal.Body style={{ flex: 1, overflowY: "scroll" }}>
          <Grid>
            {list
              ? list.map((item) => (
                  <ListItem
                    isActive={selectedFile === item.id}
                    key={item.id}
                    onClick={() => setSelectedFile(item.id)}
                  >
                    <ListItemImage src={buildApiUrl(`/images/${item.id}`)} />
                    <ListItemTitle>{item.title}</ListItemTitle>
                  </ListItem>
                ))
              : null}
          </Grid>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Actions>
            <Modal.ActionGroup>
              <Button.Tertiary onClick={close}>Abort</Button.Tertiary>
              <Button.Primary
                disabled={selectedFile === null}
                tabIndex={1}
                onClick={() => selectedFile && onSelect(selectedFile)}
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
