import { t } from "../..";

export const GraphQLPageInfoType = t.objectType<{
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string;
  endCursor?: string;
}>({
  name: "PageInfo",
  fields: () => [
    t.field({
      name: "hasNextPage",
      type: t.NonNull(t.Boolean),
      resolve: (obj) => obj.hasNextPage ?? false,
    }),
    t.field({
      name: "hasPreviousPage",
      type: t.NonNull(t.Boolean),
      resolve: (obj) => obj.hasPreviousPage ?? false,
    }),
    t.field({
      name: "startCursor",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.startCursor ?? "",
    }),
    t.field({
      name: "endCursor",
      type: t.NonNull(t.String),
      resolve: (obj) => obj.endCursor ?? "",
    }),
  ],
});

export const GraphQLNodeInterface = t.interfaceType({
  name: "Node",
  fields: () => [t.abstractField({ name: "id", type: t.NonNull(t.ID) })],
});
