import { flow } from "fp-ts/lib/function";
import * as t from "io-ts";
import * as RT from "fp-ts/lib/ReaderTask";
import last from "lodash/last";
import first from "lodash/first";

export * from "./graphql-page-info-type";

export const API_VERSION = "01" as const;

const buildResourceIdentifier = (resourceIdentifier: string) => (id: string) =>
  `${API_VERSION}:${resourceIdentifier}:${id}`;

export const base64Encode = (input: string) =>
  Buffer.from(encodeURIComponent(input)).toString("base64");
export const base64Decode = (input: string) =>
  decodeURIComponent(Buffer.from(input, "base64").toString("utf-8"));

export const encodeId = (resourceIdentifier: string) =>
  flow(buildResourceIdentifier(resourceIdentifier), base64Encode);

const IDParts = t.tuple([t.string, t.string, t.string]);

export const decodeId = flow(
  base64Decode,
  (content: string) => content.split(":"),
  IDParts.decode
);

export const decodeFirst =
  (maximumCount = 50, defaultCount = maximumCount) =>
  (first: number | null | undefined): RT.ReaderTask<any, number> =>
    first == null
      ? RT.of(defaultCount)
      : first < 0
      ? () => () => Promise.reject(new Error("Invalid first argument."))
      : first > maximumCount
      ? () => () => Promise.reject(new Error("Invalid first argument."))
      : RT.of(first);

export const buildConnectionObject = <T>(params: {
  listData: T[];
  amount: number;
  encodeCursor: (input: T) => string;
}) => {
  let hasNextPage = false;
  let listData = params.listData;
  if (listData.length > params.amount) {
    listData = listData.slice(0, params.amount);
    hasNextPage = true;
  }

  const edges = listData.map((node) => ({
    cursor: params.encodeCursor(node),
    node,
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: false,
      startCursor: first(edges)?.cursor || "",
      endCursor: last(edges)?.cursor || "",
    },
  };
};
