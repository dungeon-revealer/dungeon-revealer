import * as React from "react";
import styled from "@emotion/styled/macro";
import { useMessageAddMutation } from "./message-add-mutation";

const Container = styled.form`
  display: flex;
  margin-top: 4px;
`;

const TextArea = styled.textarea`
  display: block;
  width: 100%;
  resize: none;
  font-size: inherit;
`;

export const ChatTextArea: React.FC<{}> = () => {
  const [value, setValue] = React.useState("");
  const messageAdd = useMessageAddMutation();

  const onChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(ev.currentTarget.value);
    },
    []
  );

  const onSubmit = React.useCallback(() => {
    messageAdd({
      rawContent: value,
      authorName: "John Lenon",
    });
    setValue("");
  }, [messageAdd, value]);

  const onKeyPress = React.useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.key === "Enter") {
        onSubmit();
        ev.preventDefault();
      }
    },
    [onSubmit]
  );

  return (
    <Container onSubmit={onSubmit} onKeyPress={onKeyPress}>
      <TextArea value={value} onChange={onChange} rows={4} />
    </Container>
  );
};
