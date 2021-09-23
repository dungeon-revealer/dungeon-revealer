import { printSchema } from "graphql";
import { schema } from "../server/graphql";
import * as fs from "fs";
import * as path from "path";
import * as prettier from "prettier";

let contents = "### THIS FILE IS AUTO GENERATED\n\n" + printSchema(schema);

const filePath = path.join(__dirname, "..", "type-definitions.graphql");

contents = prettier.format(contents, {
  filepath: filePath,
});

fs.writeFileSync(filePath, contents, "utf-8");
