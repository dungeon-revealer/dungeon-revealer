import { flow } from "fp-ts/lib/function";
import * as t from "io-ts";

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
