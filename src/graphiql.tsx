import * as React from "react";
import GraphiQL from "graphiql";
import { Global, css } from "@emotion/core";
import "graphiql/graphiql.css";

export const GraphiQLRoute = (props: { fetcher: any }): React.ReactElement => {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Global
        styles={css`
          .graphiql-container * {
            box-sizing: content-box;
          }
        `}
      />
      <GraphiQL fetcher={props.fetcher} />
    </div>
  );
};
