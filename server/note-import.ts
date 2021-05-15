import { pipe, flow } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as A from "fp-ts/lib/Array";
import { sequenceT, sequenceS } from "fp-ts/lib/Apply";

import * as t from "io-ts";
import camelCase from "lodash/camelCase";
import * as md from "./markdown-to-plain-text";

const StringUtilities = {
  split1:
    (delimiter: string) =>
    (input: string): O.Option<[string, string]> => {
      const index = input.indexOf(delimiter);
      if (index === -1) {
        return O.none;
      }

      return O.some([
        input.substring(0, index),
        input.substring(index + delimiter.length),
      ]);
    },
};

const BooleanFromString = new t.Type(
  "BooleanFromString",
  (input: unknown): input is boolean => typeof input === "boolean",
  (input, context) =>
    pipe(
      t.string.validate(input, context),
      E.chain((value) => {
        if (value.toLowerCase() === "true") {
          return t.success(true);
        } else if (value.toLowerCase() === "false") {
          return t.success(false);
        }
        return t.failure(
          input,
          context,
          `Invalid value: '${value}'. Expected 'True' or 'False'`
        );
      })
    ),
  (value) => (value ? "True" : "False")
);

const NoteMetaData = t.type({
  id: t.string,
  title: t.string,
  isEntryPoint: t.boolean,
});

const NoteImportData = t.intersection([
  NoteMetaData,
  t.type({
    content: t.string,
    sanitizedContent: t.string,
  }),
]);

const parseMetaHead = (input: string) => {
  const regex = /^---\n([^]*)\n---/;
  const match = input.match(regex);
  if (!match) {
    return E.left(new Error("Could not parse meta-data."));
  }
  const [, content] = match;
  return E.right(content);
};

const parseMetaDataLines = (input: string) => {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines;
};

const sanitizeMetaDataLines = flow(
  A.map(
    flow(
      StringUtilities.split1(":"),
      O.map(
        ([key, value]) =>
          [camelCase(key.trim()), value.trim()] as [string, string]
      )
    )
  ),
  A.filter(O.isSome),
  A.map((value) => value.value)
);

const getRecord = (name: string) => (records: [string, string][]) =>
  pipe(
    O.fromNullable(records.find((record) => record[0] === name)),
    O.map(([, value]) => value)
  );

const getIdRecord = getRecord("id");
const getTitleRecord = getRecord("title");
const getIsEntryPointRecord = getRecord("isEntryPoint");

const decodeId = (id: string) =>
  id.match(/^[-\w]+$/)
    ? E.right(id)
    : E.left(new Error("Invalid characters in id."));

const sequenceTE = sequenceT(E.either);
const sequenceSE = sequenceS(E.either);

const decodeMetaData = (records: [string, string][]) =>
  pipe(
    sequenceSE({
      id: pipe(
        getIdRecord(records),
        O.fold(
          () => E.left(new Error("Missing id.")),
          (value) => E.right(value)
        ),
        E.chain(decodeId)
      ),
      title: pipe(
        getTitleRecord(records),
        O.fold(
          () => E.left(new Error("Missing title.")),
          (value) => E.right(value)
        )
      ),
      isEntryPoint: pipe(
        getIsEntryPointRecord(records),
        O.fold(
          () => E.left(new Error("Missing isEntryPoint.")),
          (value) => E.right(value)
        ),
        E.chainW(BooleanFromString.decode),
        E.mapLeft(() => new Error("Failed parsing isEntryPoint."))
      ),
    })
  );

const normalizeLineEndings = (content: string) =>
  content.replace(/\r\n/g, `\n`);

const parseBody = (content: string) =>
  pipe(
    content.replace("---", ""),
    StringUtilities.split1("---"),
    O.map(([, body]) => body.replace(/^\n*/, "")),
    O.fold(
      () => E.left(new Error("Could not find body.")),
      (body) => E.right(body)
    )
  );

const extractMetaData = flow(
  parseMetaDataLines,
  sanitizeMetaDataLines,
  decodeMetaData
);

export const parseNoteData = flow(normalizeLineEndings, (content) =>
  pipe(
    sequenceTE(
      pipe(parseMetaHead(content), E.chain(extractMetaData)),
      parseBody(content)
    ),
    E.map(([metadata, body]) => {
      return NoteImportData.encode({
        ...metadata,
        content: body,
        sanitizedContent: md.markdownToPlainText(body),
      });
    })
  )
);
