import { t } from "../..";

export const GraphQLPageInfoType = t.objectType<{
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string;
  endCursor?: string;
}>({
  name: "PageInfo",
  fields: () => [
    t.field("hasNextPage", {
      type: t.NonNull(t.Boolean),
      resolve: (obj) => obj.hasNextPage ?? false,
    }),
    t.field("hasPreviousPage", {
      type: t.NonNull(t.Boolean),
      resolve: (obj) => obj.hasPreviousPage ?? false,
    }),
    t.field("startCursor", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.startCursor ?? "",
    }),
    t.field("endCursor", {
      type: t.NonNull(t.String),
      resolve: (obj) => obj.endCursor ?? "",
    }),
  ],
});

export const GraphQLNodeInterface = t.interfaceType({
  name: "Node",
  fields: () => [t.abstractField("id", t.NonNull(t.ID))],
});
