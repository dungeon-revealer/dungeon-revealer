import * as React from "react";
import { createFragmentContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import { chatOnlineUserIndicator_data } from "./__generated__/chatOnlineUserIndicator_data.graphql";

const ChatOnlineUserIndicatorRenderer: React.FC<{
  data: chatOnlineUserIndicator_data;
}> = ({ data }) => {
  return <>{data.usersCount} Online</>;
};

export const ChatOnlineUserIndicator = createFragmentContainer(
  ChatOnlineUserIndicatorRenderer,
  {
    data: graphql`
      fragment chatOnlineUserIndicator_data on Query {
        usersCount
      }
    `,
  }
);
