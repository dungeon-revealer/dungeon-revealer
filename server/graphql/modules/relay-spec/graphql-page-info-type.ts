import { t } from "../..";

export const GraphQLPageInfoType = t.objectType<{}>({
  name: "PageInfo",
  fields: () => [
    t.field("hasNextPage", {
      type: t.NonNull(t.Boolean),
      resolve: () => false,
    }),
    t.field("hasPreviousPage", {
      type: t.NonNull(t.Boolean),
      resolve: () => false,
    }),
    t.field("startCursor", {
      type: t.NonNull(t.String),
      resolve: () => "",
    }),
    t.field("endCursor", {
      type: t.NonNull(t.String),
      resolve: () => "",
    }),
  ],
});

export const GraphQLNodeInterface = t.interfaceType({
  name: "Node",
  fields: () => [t.abstractField("id", t.NonNull(t.ID))],
});
