import { flow } from "fp-ts/lib/function";
import * as t from "io-ts";

export * from "./graphql-page-info-type";

interface IdRecordTarget {
  id: string;
}

export const API_VERSION = "01" as const;

const buildResourceIdentifier = (resourceIdentifier: string) => ({
  id,
}: IdRecordTarget) => `${API_VERSION}:${resourceIdentifier}:${id}`;

const base64Encode = (input: string) => Buffer.from(input).toString("base64");
const base64Decode = (input: string) =>
  Buffer.from(input, "base64").toString("utf-8");

export const encodeId = (resourceIdentifier: string) =>
  flow(buildResourceIdentifier(resourceIdentifier), base64Encode);

const IDParts = t.tuple([t.string, t.string, t.string]);

export const decodeId = flow(
  base64Decode,
  (content: string) => content.split(":"),
  IDParts.decode
);
