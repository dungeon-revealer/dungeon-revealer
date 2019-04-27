"use strict";

module.exports = {
  root: true,
  extends: ["eslint:recommended", "prettier"],
  rules: {
    "prefer-const": ["error"],
    "no-var": ["error"],
    eqeqeq: ["error"],
    camelcase: ["error"]
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
        browser: true
      },
      files: ["public/**/*.js"]
    }
  ]
};
