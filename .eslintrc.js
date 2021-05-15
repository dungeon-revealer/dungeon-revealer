"use strict";

module.exports = {
  root: true,
  extends: ["eslint:recommended", "react-app", "prettier"],
  rules: {
    "prefer-const": ["warn"],
    "no-var": ["warn"],
    eqeqeq: ["warn"],
    camelcase: ["warn"],
    "no-console": ["off"],
    "no-unused-vars": ["warn"],
    "react-hooks/exhaustive-deps": [
      "warn",
      {
        additionalHooks: "useAsyncEffect|useResetState",
      },
    ],
  },
  parserOptions: {
    ecmaVersion: 2017,
  },
  overrides: [
    {
      env: {
        node: true,
      },
      parserOptions: {
        sourceType: "script",
      },
      files: ["*/**.js", "!src/**/*.js"],
      rules: {
        strict: ["warn", "global"],
        "no-path-concat": ["warn"],
      },
    },
    {
      files: ["src/**/*.js"],
      env: {
        browser: true,
      },
      parserOptions: {
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  ],
};
