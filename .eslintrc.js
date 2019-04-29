"use strict";

module.exports = {
  root: true,
  extends: ["eslint:recommended", "react-app", "prettier"],
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
    },
    {
      files: ["src/**/*.js"],
      env: {
        browser: true
      },
      parserOptions: {
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  ]
};
