import { pipe, flow } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as A from "fp-ts/lib/Array";
import * as t from "io-ts";
import camelCase from "lodash/camelCase";
import sanitizeHtml from "sanitize-html";
import showdown from "showdown";

const StringUtilities = {
  split1: (delimiter: string) => (
    input: string
  ): O.Option<[string, string]> => {
    const index = input.indexOf(delimiter);
    if (index === -1) {
      return O.none;
    }

    return O.some([input.substring(0, index), input.substring(index + 1)]);
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
  O.fromNullable(records.find((record) => record[0] === name));

const getIdRecord = getRecord("id");
const getTitleRecord = getRecord("title");
const getIsEntryPointRecord = getRecord("isEntryPoint");

const decodeMetaData = (records: [string, string][]) =>
  pipe(
    getIdRecord(records),
    O.fold(
      () => E.left(new Error("Missing id.")),
      ([_, id]) =>
        pipe(
          getTitleRecord(records),
          O.fold(
            () => E.left(new Error("Missing title.")),
            ([_, title]) =>
              pipe(
                getIsEntryPointRecord(records),
                O.fold(
                  () => E.left(new Error("Missing isEntryPoint.")),
                  ([_, isEntryPoint]) =>
                    pipe(
                      BooleanFromString.decode(isEntryPoint),
                      E.map((isEntryPoint) => ({
                        id,
                        title,
                        isEntryPoint,
                      })),
                      E.mapLeft(
                        () =>
                          new Error(
                            "Invalid value provided fro 'isEntryPoint'."
                          )
                      )
                    )
                )
              )
          )
        )
    )
  );

const parseBody = (content: string) => content.replace(/^(---\n[^]*\n---)/, "");

export const sanitizeBody = (body: string) => {
  const converter = new showdown.Converter({
    tables: true,
  });

  return sanitizeHtml(converter.makeHtml(body), {
    allowedTags: [],
    nonTextTags: [
      "style",
      "script",
      "textarea",
      "option",
      "noscript",
      /* We filter out the breadcrumb because it does not provide us any information we want to search for :) */
      "breadcrumb",
    ],
  }).trimStart();
};

export const parseNoteData = (content: string) =>
  pipe(
    parseMetaHead(content),
    E.map(parseMetaDataLines),
    E.map(sanitizeMetaDataLines),
    E.chain(decodeMetaData),
    E.map((metadata) => {
      const body = parseBody(content);
      return NoteImportData.encode({
        ...metadata,
        content: body,
        sanitizedContent: sanitizeBody(body),
      });
    })
  );
