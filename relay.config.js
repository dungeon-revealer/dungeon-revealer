"use strict";

module.exports = {
  src: "./src",
  schema: "./type-definitions.graphql",
  exclude: ["**/node_modules/**", "**/__mocks__/**", "**/__generated__/**"],
  include: ["**"],
  language: "typescript",
};
