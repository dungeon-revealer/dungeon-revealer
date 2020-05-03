import { printSchema } from "graphql";
import { schema } from "../server/graphql";
import * as fs from "fs";
import * as path from "path";

const contents = "### THIS FILE IS AUTO GENERATED\n\n" + printSchema(schema);

fs.writeFileSync(
  path.join(__dirname, "..", "type-definitions.graphql"),
  contents,
  "utf-8"
);
