import * as React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import { chatSettings_data } from "./__generated__/chatSettings_data.graphql";
import { Input } from "../input";
import * as Button from "../button";
import { useResetState } from "../hooks/use-reset-state";
import { useChangeNameMutation } from "./change-name-mutation";

const ChatSettingsRenderer: React.FC<{ data: chatSettings_data }> = ({
  data,
}) => {
  const [name, setValue] = useResetState(data.name, [data.name]);
  const changeName = useChangeNameMutation();
  return (
    <>
      <Input
        value={name}
        onChange={(ev) => {
          setValue(ev.target.value);
        }}
      />
      <Button.Primary onClick={() => changeName({ name })}>Save</Button.Primary>
    </>
  );
};

export const ChatSettings = createFragmentContainer(ChatSettingsRenderer, {
  data: graphql`
    fragment chatSettings_data on User {
      id
      name
    }
  `,
});
