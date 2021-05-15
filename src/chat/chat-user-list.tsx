import * as React from "react";
import { createPaginationContainer } from "react-relay";
import graphql from "babel-plugin-relay/macro";
import { chatUserList_data } from "./__generated__/chatUserList_data.graphql";
import styled from "@emotion/styled/macro";

const ChatUser = styled.div`
  padding-top: 4px;
  padding-bottom: 4px;
  font-weight: bold;
`;

export const ChatUserListRenderer: React.FC<{ data: chatUserList_data }> = ({
  data: { users },
}) => {
  return (
    <>
      {users.edges.map((edge) => (
        <ChatUser key={edge.node.id}>{edge.node.name}</ChatUser>
      ))}
    </>
  );
};

// Fetching more is not implemented yet. These all are just dummy values.
// We used a connection becaue it is easier documented how to add edges.
export const ChatUserList = createPaginationContainer(
  ChatUserListRenderer,
  {
    data: graphql`
      fragment chatUserList_data on Query
      @argumentDefinitions(
        count: { type: "Int", defaultValue: 10 }
        cursor: { type: "ID" }
      ) {
        users(first: $count, after: $cursor)
          @connection(key: "chatUserList_users") {
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }
    `,
  },
  {
    getVariables: () => ({ count: 0, cursor: "NOT_IMPLEMENTED_YET" }),
    query: graphql`
      query chatUserListQuery($count: Int!, $cursor: ID) {
        ...chatUserList_data @arguments(count: $count, cursor: $cursor)
      }
    `,
  }
);
