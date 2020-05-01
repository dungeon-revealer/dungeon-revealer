"use strict";

const once = require("lodash/once");
const path = require("path");
const fs = require("fs-extra");
const uuid = require("uuid/v4");

/**
 *
 * @param {() => Promise<T>} task
 * @returns {() => Promise<T>}
 */
const lazy = (task) => once(task);

/**
 * @param {import("sqlite").Database} db
 **/
const createDatabaseInterface = (db) => {
  const transformRecord = ({ id, title, created_at: createdAt }) => ({
    id,
    title,
    createdAt,
  });

  const getInsertOneStatement = lazy(() =>
    db.prepare(`
      INSERT INTO "file_uploads" (
        "id",
        "title",
        "path",
        "created_at"
      ) VALUES (
        ?, ?, ?, ?
      );
    `)
  );

  /**
   * @param {{id: string; title: string; path: string; createdAt: number; }} id
   */
  const createFileUploadRecord = ({ id, title, path, createdAt }) =>
    getInsertOneStatement().then((statement) =>
      statement.run(id, title, path, createdAt)
    );

  const getSelectManyOffsetStatement = lazy(() =>
    db.prepare(`
      SELECT
        "id",
        "title",
        "created_at"
      FROM "file_uploads"
      ORDER BY "created_at" DESC
      LIMIT 20 OFFSET ?
      ;
    `)
  );

  /**
   * @param {{ offset?: number }}} param0
   */
  const selectManyOffset = ({ offset = 0 }) =>
    getSelectManyOffsetStatement()
      .then((statement) => statement.all(offset))
      .then((records) => records.map(transformRecord));

  const getSelectPathStatement = lazy(() =>
    db.prepare(`
      SELECT "path"
      FROM "file_uploads"
      WHERE
        "id" = ?
      ;
    `)
  );

  /**
   * @param {string} id
   */
  const selectPath = (id) =>
    getSelectPathStatement()
      .then((statement) => statement.get(id))
      .then((record) => (record ? record.path : null));

  const getSelectRecordByIdStatement = lazy(() =>
    db.prepare(`
      SELECT
        "id",
        "title",
        "created_at"
      FROM "file_uploads"
      WHERE
        "id" = ?
      ;
  `)
  );

  /**
   * @param {string} id
   */
  const selectRecordById = (id) =>
    getSelectRecordByIdStatement()
      .then((statement) => statement.get(id))
      .then((record) => (record ? transformRecord(record) : null));

  const getDeleteRecordByIdStatement = lazy(() =>
    db.prepare(`
      DELETE
      FROM "file_uploads"
      WHERE
        "id" = ? 
    `)
  );

  /**
   * @param {string} id
   */
  const deleteRecordById = (id) =>
    getDeleteRecordByIdStatement().then((statement) => statement.get(id));

  return {
    createFileUploadRecord,
    selectManyOffset,
    selectPath,
    selectRecordById,
    deleteRecordById,
  };
};

class FileStorage {
  constructor({ dataDirectory, db }) {
    this._storageDirectoryPath = path.join(dataDirectory, "images");
    this._db = createDatabaseInterface(db);
    fs.mkdirpSync(this._storageDirectoryPath);
  }

  async store({ fileName: originalFileName, filePath, fileExtension }) {
    const id = uuid();
    const fileName = `${id}.${fileExtension}`;
    const destinationPath = path.join(this._storageDirectoryPath, fileName);
    const relativeDestinationPath = path.relative(
      this._storageDirectoryPath,
      destinationPath
    );

    await fs.move(filePath, destinationPath);
    await this._db.createFileUploadRecord({
      id,
      title: originalFileName,
      path: relativeDestinationPath,
      createdAt: new Date().getTime(),
    });

    return { id, fileName };
  }

  async list(offset) {
    const records = await this._db.selectManyOffset({ offset });
    return records;
  }

  async get(id) {
    const record = await this._db.selectRecordById(id);
    return record;
  }

  async delete(id) {
    await this._db.deleteRecordById(id);
  }

  async resolvePath(fileId) {
    const filePath = await this._db.selectPath(fileId);

    if (!filePath) {
      return {
        error: {
          code: "ERR_NOT_FOUND",
        },
        data: null,
      };
    }
    return {
      error: null,
      data: { filePath: path.resolve(this._storageDirectoryPath, filePath) },
    };
  }
}

module.exports = { FileStorage };
