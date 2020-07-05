import { t } from "..";
import last from "lodash/last";
import first from "lodash/first";
import * as io from "io-ts";
import * as Relay from "./relay-spec";
import { flow } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RT from "fp-ts/lib/ReaderTask";
import * as E from "fp-ts/lib/Either";
import * as notes from "../../notes-lib";
import { pipe } from "fp-ts/lib/pipeable";
import * as util from "../../markdown-to-plain-text";
import * as O from "fp-ts/lib/Option";

export const NOTE_URI = "Note" as const;

export const isTypeOfNote = notes.NoteModel.is;

export type NoteModelType = notes.NoteModelType;

export const encodeNoteId = Relay.encodeId(NOTE_URI);

export const decodeNoteId = flow(
  Relay.decodeId,
  E.chainW(([, type, id]) =>
    type === NOTE_URI
      ? E.right(id)
      : E.left(new Error(`Invalid type '${type}'.`))
  )
);

export const GraphQLNoteType = t.objectType<notes.NoteModelType>({
  name: "Note",
  interfaces: [Relay.GraphQLNodeInterface],
  isTypeOf: isTypeOfNote,
  fields: () => [
    t.field("id", {
      type: t.NonNull(t.ID),
      resolve: ({ id }) => encodeNoteId(id),
    }),
    t.field("documentId", {
      type: t.NonNull(t.ID),
      resolve: (record) => record.id,
    }),
    t.field("title", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.title,
    }),
    t.field("content", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.content,
    }),
    t.field("contentPreview", {
      type: t.NonNull(t.String),
      resolve: (obj) =>
        pipe(util.markdownToPlainText(obj.content), util.shortenText(100)),
    }),
    t.field("createdAt", {
      type: t.NonNull(t.Int),
      resolve: (obj) => obj.createdAt,
    }),
    t.field("viewerCanEdit", {
      type: t.NonNull(t.Boolean),
      resolve: (obj, args, context) => context.viewerRole === "admin",
    }),
    t.field("viewerCanShare", {
      type: t.NonNull(t.Boolean),
      resolve: (obj, args, context) => obj.type === "public",
    }),
    t.field("updatedAt", {
      type: t.NonNull(t.Int),
      resolve: (obj) => obj.updatedAt,
    }),
  ],
});

type NoteEdgeType = {
  cursor: string;
  node: notes.NoteModelType;
};

type NoteConnectionType = {
  edges: NoteEdgeType[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
};

const GraphQLNoteEdgeType = t.objectType<NoteEdgeType>({
  name: "NoteEdge",
  fields: () => [
    t.field("cursor", {
      type: t.NonNull(t.String),
      resolve: (edge) => edge.cursor,
    }),
    t.field("node", {
      type: t.NonNull(GraphQLNoteType),
      resolve: (edge) => edge.node,
    }),
  ],
});

const GraphQLNoteConnectionType = t.objectType<NoteConnectionType>({
  name: "NoteConnection",
  fields: () => [
    t.field("edges", {
      type: t.NonNull(t.List(t.NonNull(GraphQLNoteEdgeType))),
      resolve: (connection) => connection.edges,
    }),
    t.field("pageInfo", {
      type: t.NonNull(Relay.GraphQLPageInfoType),
      resolve: (obj) => obj.pageInfo,
    }),
  ],
});

const resolvePaginatedNotes = (amount: number) =>
  pipe(
    notes.getPaginatedNotes({ first: amount + 1 }),
    RTE.map((notes) => {
      let hasNextPage = false;
      if (notes.length > amount) {
        notes.pop();
        hasNextPage = true;
      }

      const edges = notes.map((node) => ({
        cursor: encodeNotesConnectionCursor(node),
        node: node,
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
    }),
    RTE.fold(
      (err) => {
        throw err;
      },
      (obj) => RT.of(obj)
    )
  );

const resolveMorePaginatedNotes = (
  amount: number,
  lastCreatedAt: number,
  lastId: string
) =>
  pipe(
    notes.getMorePaginatedNotes({ first: amount + 1, lastCreatedAt, lastId }),
    RTE.map((notes) => {
      let hasNextPage = false;
      if (notes.length > amount) {
        notes.pop();
        hasNextPage = true;
      }

      const edges = notes.map((node) => ({
        cursor: encodeNotesConnectionCursor(node),
        node: node,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: true,
          startCursor: first(edges)?.cursor || "",
          endCursor: last(edges)?.cursor || "",
        },
      };
    }),
    RTE.fold(
      (err) => {
        throw err;
      },
      (obj) => RT.of(obj)
    )
  );

export const resolveNote = flow(
  notes.getNoteById,
  RTE.fold(
    (err) => {
      throw err;
    },
    (obj) => RT.of(obj)
  )
);

const GraphQLNoteSearchResultType = t.objectType<notes.NoteSearchMatchType>({
  name: "NoteSearchResultType",
  fields: () => [
    t.field("noteId", {
      type: t.NonNull(t.ID),
      resolve: (obj) => encodeNoteId(obj.noteId),
    }),
    t.field("title", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.title,
    }),
    t.field("preview", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.preview,
    }),
  ],
});

const GraphQLNoteSearchEdgeType = t.objectType<notes.NoteSearchMatchType>({
  name: "NoteSearchEdgeType",
  fields: () => [
    t.field("cursor", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.noteId,
    }),
    t.field("node", {
      type: t.NonNull(GraphQLNoteSearchResultType),
      resolve: (obj) => obj,
    }),
  ],
});

type NoteSearchConnectionType = {
  edges: notes.NoteSearchMatchType[];
};

const GraphQLNoteSearchConnectionType = t.objectType<NoteSearchConnectionType>({
  name: "NoteSearchConnection",
  fields: () => [
    t.field("pageInfo", {
      type: Relay.GraphQLPageInfoType,
      resolve: () => ({}),
    }),
    t.field("edges", {
      type: t.NonNull(t.List(t.NonNull(GraphQLNoteSearchEdgeType))),
      resolve: (obj) => obj.edges,
    }),
  ],
});

const resolveNotesSearch = (query: string) =>
  pipe(
    notes.findPublicNotes(query),
    RTE.fold(
      (err) => {
        throw err;
      },
      (edges) => {
        return RT.of({ edges });
      }
    )
  );

const NotesConnectionVersion = io.literal("1");
const NotesConnectionIdentifier = io.literal("NOTES_CONNECTION");
const NotesConnectionCreatedAt = io.number;
const NotesConnectionNoteId = io.string;

const NotesConnectionCursorModel = io.tuple([
  NotesConnectionVersion,
  NotesConnectionIdentifier,
  NotesConnectionCreatedAt,
  NotesConnectionNoteId,
]);

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

const parseIntegerSafe = (input: string) => parseInt(input, 10);

// TODO: investigate how we can do this with less noise :)
const decodeNotesConnectionCursor = flow(
  Relay.base64Decode,
  StringUtilities.split1(":"),
  O.chain(([version, rest]) => {
    return pipe(
      NotesConnectionVersion.decode(version),
      E.fold(
        () => O.none,
        () => StringUtilities.split1(":")(rest)
      ),
      O.chain(([identifier, rest]) =>
        pipe(
          NotesConnectionIdentifier.decode(identifier),
          E.fold(
            () => O.none,
            () => StringUtilities.split1(":")(rest)
          ),
          O.chain(([rawCreatedAt, rest]) => {
            const createdAt = parseIntegerSafe(rawCreatedAt);
            return pipe(
              NotesConnectionCreatedAt.decode(createdAt),
              E.fold(
                () => O.none,
                () => O.some([createdAt, rest] as const)
              )
            );
          })
        )
      )
    );
  })
);

const encodeNotesConnectionCursor = ({
  createdAt,
  id,
}: {
  createdAt: number;
  id: string;
}) =>
  pipe(
    NotesConnectionCursorModel.encode(["1", "NOTES_CONNECTION", createdAt, id]),
    (content) => content.join(":"),
    Relay.base64Encode
  );

export const queryFields = [
  t.field("notes", {
    type: t.NonNull(GraphQLNoteConnectionType),
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.String),
    },
    resolve: (obj, args, context) => {
      // @TODO: strict first validation max/min & negative
      const first = args.first || 10;
      if (args.after) {
        return pipe(
          decodeNotesConnectionCursor(args.after),
          O.fold(
            () => {
              throw Error("Invalid cursor.");
            },
            ([lastCreatedAt, lastId]) => {
              return RT.run(
                resolveMorePaginatedNotes(first, lastCreatedAt, lastId),
                context
              );
            }
          )
        );
      } else {
        return RT.run(resolvePaginatedNotes(first), context);
      }
    },
  }),
  t.field("notesSearch", {
    type: t.NonNull(GraphQLNoteSearchConnectionType),
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.String),
      query: t.arg(t.String),
    },
    resolve: (obj, args, context) =>
      RT.run(resolveNotesSearch(args.query || ""), context),
  }),
  t.field("note", {
    type: GraphQLNoteType,
    args: {
      documentId: t.arg(t.NonNullInput(t.ID)),
    },
    resolve: (obj, args, context) =>
      RT.run(resolveNote(args.documentId), context),
  }),
];

const GraphQLNoteCreateInput = t.inputObjectType({
  name: "NoteCreateInput",
  fields: () => ({
    title: {
      type: t.NonNullInput(t.String),
    },
    content: {
      type: t.NonNullInput(t.String),
    },
    isEntryPoint: {
      type: t.NonNullInput(t.Boolean),
    },
  }),
});

const GraphQLNoteCreateResult = t.objectType<{ note: notes.NoteModelType }>({
  name: "NoteCreateResult",
  fields: () => [
    t.field("note", {
      type: t.NonNull(GraphQLNoteType),
      resolve: (obj) => obj.note,
    }),
  ],
});

const resolveNoteCreate = flow(
  notes.createNote,
  RTE.chain((id) => notes.getNoteById(id)),
  RTE.fold(
    (err) => {
      throw err;
    },
    (note) => RT.of({ note })
  )
);

const resolveNoteDelete = flow(
  decodeNoteId,
  RTE.fromEither,
  RTE.chain(notes.deleteNote),
  RTE.map((id) => encodeNoteId(id)),
  RTE.fold(
    (err) => {
      throw err;
    },
    (deletedNoteId) => RT.of({ deletedNoteId })
  )
);

const GraphQLNoteDeleteInputType = t.inputObjectType({
  name: "NoteDeleteInput",
  fields: () => ({
    noteId: { type: t.NonNullInput(t.String) },
  }),
});

const GraphQLNoteDeleteResult = t.objectType<{ deletedNoteId: string }>({
  name: "NoteDeleteResult",
  fields: () => [
    t.field("success", {
      type: t.NonNull(t.Boolean),
      resolve: () => true,
    }),
    t.field("deletedNoteId", {
      type: t.NonNull(t.ID),
      resolve: (obj) => obj.deletedNoteId,
    }),
  ],
});

const GraphQLNoteUpdateInputType = t.inputObjectType({
  name: "NoteUpdateInput",
  fields: () => ({
    id: { type: t.NonNullInput(t.String) },
    title: { type: t.NonNullInput(t.String) },
    content: { type: t.NonNullInput(t.String) },
  }),
});

const GraphQLNoteUpdateResult = t.objectType<{ note: notes.NoteModelType }>({
  name: "NoteUpdateResult",
  fields: () => [
    t.field("note", {
      type: GraphQLNoteType,
      resolve: (obj) => obj.note,
    }),
  ],
});

const resolveNoteUpdate = flow(
  notes.updateNote,
  RTE.chain((id) => notes.getNoteById(id)),
  RTE.fold(
    (err) => {
      throw err;
    },
    (note) => RT.of({ note })
  )
);

const tryDecodeId = flow(
  decodeNoteId,
  E.fold(
    (err) => {
      throw err;
    },
    (id) => id
  )
);

export const mutationFields = [
  t.field("noteCreate", {
    type: t.NonNull(GraphQLNoteCreateResult),
    args: {
      input: t.arg(t.NonNullInput(GraphQLNoteCreateInput)),
    },
    resolve: (src, { input }, context) =>
      RT.run(resolveNoteCreate(input), context),
  }),
  t.field("noteDelete", {
    type: t.NonNull(GraphQLNoteDeleteResult),
    args: {
      input: t.arg(t.NonNullInput(GraphQLNoteDeleteInputType)),
    },
    resolve: (src, { input }, context) =>
      RT.run(resolveNoteDelete(input.noteId), context),
  }),
  t.field("noteUpdate", {
    type: t.NonNull(GraphQLNoteUpdateResult),
    args: {
      input: t.arg(t.NonNullInput(GraphQLNoteUpdateInputType)),
    },
    resolve: (src, args, context) => {
      return RT.run(
        resolveNoteUpdate({ ...args.input, id: tryDecodeId(args.input.id) }),
        context
      );
    },
  }),
];
