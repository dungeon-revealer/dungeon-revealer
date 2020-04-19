"use strict";

const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const path = require("path");

/**
 * @param {{ dataPath: string }}
 */
const loadDatabase = ({ dataPath }) =>
  sqlite.open({
    filename: path.join(dataPath, `db.sqlite`),
    driver: sqlite3.Database,
  });

/**
 * @param {sqlite.Database} db
 * @returns {Promise<sqlite.Database>}
 */
const runMigrations = async (db) => {
  const result = await db.get(`PRAGMA "user_version";`);
  let userVersion = null;
  if (result) {
    userVersion = result.user_version || 0;
  }
  // eslint-disable-next-line default-case
  switch (userVersion) {
    case 0:
      await db.exec(`
        BEGIN TRANSACTION;
        PRAGMA "user_version" = 1;
        CREATE TABLE "file_uploads" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "title" TEXT NOT NULL,
          "path" TEXT NOT NULL,
          "created_at" INT NOT NULL
        );
        COMMIT;
      `);
  }

  return db;
};

const initialize = ({ dataPath }) =>
  Promise.resolve()
    .then(() => loadDatabase({ dataPath }))
    .then(runMigrations);

module.exports = {
  initialize,
};
