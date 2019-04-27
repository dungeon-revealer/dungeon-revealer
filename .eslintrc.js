"use strict";

module.exports = {
  root: true,
  extends: ["eslint:recommended", "prettier"],
  rules: {
    "prefer-const": ["error"],
    "no-var": ["error"],
    eqeqeq: ["error"],
    camelcase: ["error"],
    "no-console": ["off"]
  },
  parserOptions: {
    ecmaVersion: 2017
  },
  overrides: [
    {
      env: {
        node: true
      },
      files: ["app.js"]
    },
    {
      env: {
        browser: true,
        amd: true
      },
      files: ["public/**/*.js"]
    }
  ]
};
