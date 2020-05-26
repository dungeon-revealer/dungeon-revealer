import * as React from "react";
import styled from "@emotion/styled/macro";
import createPersistedState from "use-persisted-state";
import { useMessageAddMutation } from "./message-add-mutation";

const Container = styled.form`
  display: flex;
  padding-top: 8px;
  margin-top: auto;
`;

const TextArea = styled.textarea`
  display: block;
  width: 100%;
  resize: none;
  font-size: inherit;
  font-family: inherit;
  letter-spacing: 0.2px;
  padding: 4px;
`;

const useRawChatHistory = createPersistedState("chat.history");

const useChatHistory = (size = 10): [string[], (text: string) => void] => {
  const [data, setData] = useRawChatHistory(() => [] as unknown);

  const pushValue = React.useCallback(
    (text) => {
      setData((data: unknown) => {
        const newData = Array.isArray(data) ? [text, ...data] : [text];
        if (newData.length > size) {
          newData.slice(0, newData.length - size);
        }
        return newData;
      });
    },
    [size]
  );

  return React.useMemo(() => {
    const history = Array.isArray(data) ? data : [];
    return [history, pushValue];
  }, [data, pushValue]);
};

export const ChatTextArea: React.FC<{}> = () => {
  const [value, setValue] = React.useState("");
  const [chatHistory, pushToHistory] = useChatHistory();
  const offset = React.useRef(-1);

  const messageAdd = useMessageAddMutation();

  const onChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(ev.currentTarget.value);
    },
    []
  );

  const onSubmit = React.useCallback(() => {
    if (value.trim() === "") return;
    messageAdd({
      rawContent: value,
    });
    setValue("");
    pushToHistory(value);
    offset.current = -1;
  }, [messageAdd, value]);

  const onKeyPress = React.useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.key === "Enter" && ev.shiftKey === false) {
        onSubmit();
        ev.preventDefault();
      }
    },
    [onSubmit, chatHistory, value]
  );

  const onKeyDown = React.useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.key === "ArrowUp" && ev.shiftKey === true) {
        offset.current = Math.min(offset.current + 1, chatHistory.length - 1);
        setValue((value) => chatHistory[offset.current] || value);
      } else if (ev.key === "ArrowDown" && ev.shiftKey === true) {
        offset.current = Math.max(offset.current - 1, -1);
        if (offset.current === -1) {
          setValue("");
        } else {
          setValue((value) => chatHistory[offset.current] || value);
        }
      }
    },
    [value]
  );

  return (
    <Container
      onSubmit={onSubmit}
      onKeyPress={onKeyPress}
      onKeyDown={onKeyDown}
    >
      <TextArea value={value} onChange={onChange} rows={5} />
    </Container>
  );
};
