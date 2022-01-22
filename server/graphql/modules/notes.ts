import { flow, pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RT from "fp-ts/lib/ReaderTask";
import * as E from "fp-ts/lib/Either";
import { sequenceT } from "fp-ts/lib/Apply";
import * as io from "io-ts";
import first from "lodash/first";
import * as Relay from "./relay-spec";
import type { SubscriptionField } from "gqtx";
import { t } from "..";
import * as notes from "../../notes-lib";
import * as util from "../../markdown-to-plain-text";
import { IntegerFromString } from "../../io-types/integer-from-string";
import { applyDecoder } from "../../apply-decoder";

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
    t.field({
      name: "id",
      type: t.NonNull(t.ID),
      resolve: ({ id }) => encodeNoteId(id),
    }),
    t.field({
      name: "documentId",
      type: t.NonNull(t.ID),
      resolve: (record) => record.id,
    }),
    t.field({
      name: "title",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.title,
    }),
    t.field({
      name: "content",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.content,
    }),
    t.field({
      name: "contentPreview",
      type: t.NonNull(t.String),
      resolve: (obj) =>
        pipe(util.markdownToPlainText(obj.content), util.shortenText(100)),
    }),
    t.field({
      name: "createdAt",
      type: t.NonNull(t.Int),
      resolve: (obj) => obj.createdAt,
    }),
    t.field({
      name: "viewerCanEdit",
      type: t.NonNull(t.Boolean),
      resolve: (_, __, context) => context.session.role === "admin",
    }),
    t.field({
      name: "viewerCanShare",
      type: t.NonNull(t.Boolean),
      resolve: (obj) => obj.type === "public",
    }),
    t.field({
      name: "access",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.type,
    }),
    t.field({
      name: "isEntryPoint",
      type: t.NonNull(t.Boolean),
      resolve: (obj) => obj.isEntryPoint,
    }),
    t.field({
      name: "updatedAt",
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
    t.field({
      name: "cursor",
      type: t.NonNull(t.String),
      resolve: (edge) => edge.cursor,
    }),
    t.field({
      name: "node",
      type: t.NonNull(GraphQLNoteType),
      resolve: (edge) => edge.node,
    }),
  ],
});

const GraphQLNoteConnectionType = t.objectType<NoteConnectionType>({
  name: "NoteConnection",
  fields: () => [
    t.field({
      name: "edges",
      type: t.NonNull(t.List(t.NonNull(GraphQLNoteEdgeType))),
      resolve: (connection) => connection.edges,
    }),
    t.field({
      name: "pageInfo",
      type: t.NonNull(Relay.GraphQLPageInfoType),
      resolve: (obj) => obj.pageInfo,
    }),
  ],
});

const resolvePaginatedNotes = ({
  first,
  onlyEntryPoints,
  cursor,
}: {
  first: number;
  onlyEntryPoints: boolean;
  cursor: null | {
    lastCreatedAt: number;
    lastId: string;
  };
}) =>
  pipe(
    notes.getPaginatedNotes({ first: first + 1, onlyEntryPoints, cursor }),
    RTE.map((notes) =>
      Relay.buildConnectionObject({
        listData: notes,
        amount: first,
        encodeCursor: encodeNotesConnectionCursor,
      })
    ),
    RTE.fold(
      (err) => () => () => Promise.reject(err),
      (obj) => RT.of(obj)
    )
  );

export const resolveNote = flow(
  notes.getNoteById,
  RTE.fold(
    (err) => () => () => Promise.reject(err),
    (obj) => RT.of(obj)
  )
);

export const resolveMaybeNote = flow(
  notes.getMaybeNoteById,
  RTE.fold(
    (err) => () => () => Promise.reject(err),
    (obj) => RT.of(obj)
  )
);

const GraphQLNoteSearchResultType = t.objectType<notes.NoteSearchMatchType>({
  name: "NoteSearchResultType",
  fields: () => [
    t.field({
      name: "noteId",
      type: t.NonNull(t.ID),
      resolve: (obj) => encodeNoteId(obj.noteId),
    }),
    t.field({
      name: "documentId",
      type: t.NonNull(t.ID),
      resolve: (obj) => obj.noteId,
    }),
    t.field({
      name: "title",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.title,
    }),
    t.field({
      name: "preview",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.preview,
    }),
  ],
});

const GraphQLNoteSearchEdgeType = t.objectType<notes.NoteSearchMatchType>({
  name: "NoteSearchEdgeType",
  fields: () => [
    t.field({
      name: "cursor",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.noteId,
    }),
    t.field({
      name: "node",
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
    t.field({
      name: "pageInfo",
      type: Relay.GraphQLPageInfoType,
      resolve: () => ({}),
    }),
    t.field({
      name: "edges",
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
const NotesConnectionIdentifier = io.literal("NotesConnection");
const NotesConnectionCreatedAt = IntegerFromString;
const NotesConnectionNoteId = io.string;

const NotesConnectionCursorModel = io.tuple([
  NotesConnectionVersion,
  NotesConnectionIdentifier,
  NotesConnectionCreatedAt,
  NotesConnectionNoteId,
]);

const decodeNotesConnectionCursor = (
  cursor: string | null | undefined
): RT.ReaderTask<any, null | { lastCreatedAt: number; lastId: string }> =>
  cursor === "" || cursor == null
    ? RT.of(null)
    : pipe(
        Relay.base64Decode(cursor),
        (value) => value.split(":"),
        applyDecoder(NotesConnectionCursorModel),
        RT.map(([_, __, lastCreatedAt, lastId]) => ({ lastCreatedAt, lastId }))
      );

const encodeNotesConnectionCursor = ({
  createdAt,
  id,
}: {
  createdAt: number;
  id: string;
}) =>
  pipe(
    NotesConnectionCursorModel.encode(["1", "NotesConnection", createdAt, id]),
    (content) => content.join(":"),
    Relay.base64Encode
  );

const GraphQLNotesFilterEnum = t.enumType<"entrypoint" | "all">({
  name: "NotesFilter",
  description: "A filter that can be applied to the paginated notes.",
  values: [
    {
      name: "Entrypoint",
      description: "Only return notes that are marked as entrypoints.",
      value: "entrypoint",
    },
    {
      name: "All",
      description: "Return all notes.",
      value: "all",
    },
  ],
});

const sequenceRT = sequenceT(RT.readerTask);

export const queryFields = [
  t.field({
    name: "notes",
    type: t.NonNull(GraphQLNoteConnectionType),
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.String),
      filter: t.arg(GraphQLNotesFilterEnum),
    },
    resolve: (_, args, context) => {
      return RT.run(
        pipe(
          sequenceRT(
            decodeNotesConnectionCursor(args.after),
            Relay.decodeFirst(50, 10)(args.first)
          ),
          RT.chainW(([cursor, first]) =>
            resolvePaginatedNotes({
              first,
              onlyEntryPoints: args.filter === "entrypoint",
              cursor,
            })
          )
        ),
        context
      );
    },
  }),
  t.field({
    name: "notesSearch",
    type: t.NonNull(GraphQLNoteSearchConnectionType),
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.String),
      query: t.arg(t.String),
    },
    resolve: (_, args, context) =>
      RT.run(resolveNotesSearch(args.query || ""), context),
  }),
  t.field({
    name: "note",
    type: GraphQLNoteType,
    args: {
      documentId: t.arg(t.NonNullInput(t.ID)),
    },
    extensions: {
      liveQuery: {
        collectResourceIdentifiers: (
          _: unknown,
          args: { documentId: string }
        ) => `Note:${args.documentId}`,
      },
    },
    resolve: (_, args, context) =>
      RT.run(resolveMaybeNote(args.documentId), context),
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
    t.field({
      name: "note",
      type: t.NonNull(GraphQLNoteType),
      resolve: (obj) => obj.note,
    }),
  ],
});

const resolveNoteCreate = flow(
  notes.createNote,
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
  RTE.map(encodeNoteId),
  RTE.fold(
    (err) => {
      console.log(JSON.stringify(err, null, 2));
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
    t.field({
      name: "success",
      type: t.NonNull(t.Boolean),
      resolve: () => true,
    }),
    t.field({
      name: "deletedNoteId",
      type: t.NonNull(t.ID),
      resolve: (obj) => obj.deletedNoteId,
    }),
  ],
});

const GraphQLNoteUpdateContentInputType = t.inputObjectType({
  name: "NoteUpdateContentInput",
  fields: () => ({
    id: { type: t.NonNullInput(t.String) },
    content: { type: t.NonNullInput(t.String) },
  }),
});

const GraphQLNoteUpdateAccessInputType = t.inputObjectType({
  name: "NoteUpdateAccessInput",
  fields: () => ({
    id: { type: t.NonNullInput(t.String) },
    access: { type: t.NonNullInput(t.String) },
  }),
});

const GraphQLNoteUpdateIsEntryPointInputType = t.inputObjectType({
  name: "NoteUpdateIsEntryPointInput",
  fields: () => ({
    id: { type: t.NonNullInput(t.String) },
    isEntryPoint: { type: t.NonNullInput(t.Boolean) },
  }),
});

const GraphQLNoteUpdateResult = t.objectType<{ note: notes.NoteModelType }>({
  name: "NoteUpdateResult",
  fields: () => [
    t.field({
      name: "note",
      type: GraphQLNoteType,
      resolve: (obj) => obj.note,
    }),
  ],
});

const findNoteById = flow(
  RTE.chainW(notes.getNoteById),
  RTE.fold(
    (err) => {
      throw err;
    },
    (note) => RT.of({ note })
  )
);

const resolveNoteContentUpdate = flow(notes.updateNoteContent, findNoteById);

const resolveNoteTitleUpdate = flow(notes.updateNoteTitle, findNoteById);

const resolveNoteAccessUpdate = flow(notes.updateNoteAccess, findNoteById);

const resolveNoteIsEntryPointUpdate = flow(
  notes.updateNoteIsEntryPoint,
  findNoteById
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

const GraphQLNoteUpdateTitleInputType = t.inputObjectType({
  name: "NoteUpdateTitleInput",
  fields: () => ({
    id: { type: t.NonNullInput(t.String) },
    title: { type: t.NonNullInput(t.String) },
  }),
});

export const mutationFields = [
  t.field({
    name: "noteCreate",
    type: t.NonNull(GraphQLNoteCreateResult),
    args: {
      input: t.arg(t.NonNullInput(GraphQLNoteCreateInput)),
    },
    resolve: (_, { input }, context) =>
      RT.run(resolveNoteCreate(input), context),
  }),
  t.field({
    name: "noteDelete",
    type: t.NonNull(GraphQLNoteDeleteResult),
    args: {
      input: t.arg(t.NonNullInput(GraphQLNoteDeleteInputType)),
    },
    resolve: (src, { input }, context) =>
      RT.run(resolveNoteDelete(input.noteId), context),
  }),
  t.field({
    name: "noteUpdateContent",
    type: t.NonNull(GraphQLNoteUpdateResult),
    args: {
      input: t.arg(t.NonNullInput(GraphQLNoteUpdateContentInputType)),
    },
    resolve: (_, args, context) => {
      return RT.run(
        resolveNoteContentUpdate({
          ...args.input,
          id: tryDecodeId(args.input.id),
        }),
        context
      );
    },
  }),
  t.field({
    name: "noteUpdateTitle",
    type: t.NonNull(GraphQLNoteUpdateResult),
    args: {
      input: t.arg(t.NonNullInput(GraphQLNoteUpdateTitleInputType)),
    },
    resolve: (_, args, context) => {
      return RT.run(
        resolveNoteTitleUpdate({
          ...args.input,
          id: tryDecodeId(args.input.id),
        }),
        context
      );
    },
  }),
  t.field({
    name: "noteUpdateAccess",
    type: t.NonNull(GraphQLNoteUpdateResult),
    args: {
      input: t.arg(t.NonNullInput(GraphQLNoteUpdateAccessInputType)),
    },
    resolve: (_, args, context) => {
      return RT.run(
        resolveNoteAccessUpdate({
          ...args.input,
          id: tryDecodeId(args.input.id),
        }),
        context
      );
    },
  }),
  t.field({
    name: "noteUpdateIsEntryPoint",
    type: t.NonNull(GraphQLNoteUpdateResult),
    args: {
      input: t.arg(t.NonNullInput(GraphQLNoteUpdateIsEntryPointInputType)),
    },
    resolve: (_, args, context) => {
      return RT.run(
        resolveNoteIsEntryPointUpdate({
          ...args.input,
          id: tryDecodeId(args.input.id),
        }),
        context
      );
    },
  }),
];

const GraphQLNotesConnectionEdgeInsertionUpdateType = t.objectType<{
  previousNote: null | notes.NoteModelType;
  note: notes.NoteModelType;
}>({
  name: "NotesConnectionEdgeInsertionUpdate",
  description:
    "Describes where a edge should be inserted inside a NotesConnection.",
  fields: () => [
    t.field({
      name: "previousCursor",
      type: t.String,
      description:
        "The cursor of the item before which the node should be inserted.",
      resolve: (obj) =>
        obj.previousNote ? encodeNotesConnectionCursor(obj.previousNote) : null,
    }),
    t.field({
      name: "edge",
      type: GraphQLNoteEdgeType,
      description: "The edge that should be inserted.",
      resolve: (obj) => ({
        cursor: encodeNotesConnectionCursor(obj.note),
        node: obj.note,
      }),
    }),
  ],
});

const GraphQLNotesUpdatesType = t.objectType<{
  removedNoteId: null | string;
  addedNodeId: null | string;
  updatedNoteId: null | string;
  mode: "entrypoint" | "all";
}>({
  name: "NotesUpdates",
  description: "Describes update instructions for the NoteConnection type.",
  fields: () => [
    t.field({
      name: "addedNode",
      type: GraphQLNotesConnectionEdgeInsertionUpdateType,
      description: "A node that was added to the connection.",
      resolve: (obj, _, context) =>
        obj.addedNodeId
          ? RT.run(
              pipe(
                notes.getNoteById(obj.addedNodeId),
                RTE.chainW((note) =>
                  pipe(
                    notes.getPaginatedNotes({
                      first: 10,
                      onlyEntryPoints: obj.mode === "entrypoint",
                      cursor: {
                        lastCreatedAt: note.createdAt,
                        lastId: note.id,
                      },
                    }),
                    RTE.map((records) => ({
                      previousNote: first(records) ?? null,
                      note,
                    }))
                  )
                ),
                RTE.fold(
                  (err) => () => () => Promise.reject(err),
                  (payload) => RT.of(payload)
                )
              ),
              context
            )
          : null,
    }),
    t.field({
      name: "updatedNote",
      type: GraphQLNoteType,
      description: "A note that was updated.",
      resolve: (obj, _, context) =>
        obj.updatedNoteId
          ? RT.run(resolveNote(obj.updatedNoteId), context)
          : null,
    }),
    t.field({
      name: "removedNoteId",
      type: t.ID,
      description: "A note that was removed.",
      resolve: (obj) =>
        obj.removedNoteId ? encodeNoteId(obj.removedNoteId) : null,
    }),
  ],
});

export const subscriptionFields: SubscriptionField<any, any, any, any>[] = [
  t.subscriptionField({
    name: "notesUpdates",
    type: t.NonNull(GraphQLNotesUpdatesType),
    args: {
      filter: t.arg(GraphQLNotesFilterEnum),
      endCursor: t.arg(t.NonNullInput(t.String)),
      hasNextPage: t.arg(t.NonNullInput(t.Boolean)),
    },
    subscribe: (_, args, context) =>
      RT.run(
        pipe(
          decodeNotesConnectionCursor(args.endCursor),
          RTE.rightReaderTask,
          RTE.chainW((cursor) =>
            notes.subscribeToNotesUpdates({
              mode: args.filter ?? "entrypoint",
              cursor,
              hasNextPage: args.hasNextPage,
            })
          ),
          RTE.fold(
            (err) => () => () => Promise.reject(err),
            (value) => RT.of(value)
          )
        ),
        context
      ),
  }),
];
