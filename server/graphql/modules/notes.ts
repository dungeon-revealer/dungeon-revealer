import { t } from "..";
import * as Relay from "./relay-spec";
import { flow } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RT from "fp-ts/lib/ReaderTask";
import * as E from "fp-ts/lib/Either";
import * as notes from "../../notes-lib";

export const URI = "Note" as const;

const isTypeOf = flow(
  notes.decodeNote,
  E.fold(
    () => false,
    () => true
  )
);

export const encodeId = Relay.encodeId(URI);

const decodeId = flow(
  Relay.decodeId,
  E.chainW(([, type, id]) =>
    type === URI ? E.right(id) : E.left(new Error(`Invalid type '${type}'.`))
  )
);

export const GraphQLNoteType = t.objectType<notes.NoteModelType>({
  name: "Note",
  interfaces: [Relay.GraphQLNodeInterface],
  isTypeOf,
  fields: () => [
    t.field("id", {
      type: t.NonNull(t.ID),
      resolve: ({ id }) => encodeId(id),
    }),
    t.field("title", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.title,
    }),
    t.field("content", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.content,
    }),
    t.field("createdAt", {
      type: t.NonNull(t.Int),
      resolve: (obj) => obj.createdAt,
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
      resolve: () => ({}),
    }),
  ],
});

const resolveNotes = flow(
  notes.getPaginatedNotes,
  RTE.map((notes) => ({
    edges: notes.map((node) => ({
      cursor: node.id,
      node: node,
    })),
  })),
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

export const queryFields = [
  t.field("notes", {
    type: t.NonNull(GraphQLNoteConnectionType),
    args: {
      first: t.arg(t.Int),
      after: t.arg(t.String),
    },
    resolve: (obj, args, context) => resolveNotes()(context)(),
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
      console.log(err);

      throw err;
    },
    (note) => RT.of({ note })
  )
);

const resolveNoteDelete = flow(
  decodeId,
  RTE.fromEither,
  RTE.chain(notes.deleteNote),
  RTE.map((id) => encodeId(id)),
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
  decodeId,
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
