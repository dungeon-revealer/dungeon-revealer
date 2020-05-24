import * as React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import { chatSettings_data } from "./__generated__/chatSettings_data.graphql";
import { Input } from "../input";
import * as Button from "../button";
import { useResetState } from "../hooks/use-reset-state";
import { useChangeNameMutation } from "./change-name-mutation";
import styled from "@emotion/styled/macro";
import * as Icon from "../feather-icons";

const LabelText = styled.div`
  text-transform: uppercase;
  font-weight: bold;
  color: rgb(62, 76, 88);
  letter-spacing: 1px;
  padding-bottom: 8px;
`;

const ChatSettingsRenderer: React.FC<{ data: chatSettings_data }> = ({
  data,
}) => {
  const [name, setValue] = useResetState(data.name, [data.name]);
  const changeName = useChangeNameMutation();
  return (
    <>
      <label>
        <LabelText>Name</LabelText>
        <Input
          value={name}
          onChange={(ev) => {
            setValue(ev.target.value);
          }}
        />
      </label>
      <Button.Primary
        onClick={() => changeName({ name })}
        small
        style={{ marginTop: 8, marginLeft: "auto" }}
      >
        <Icon.CheckIcon height={16} width={16} />
        <span>Save</span>
      </Button.Primary>
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
