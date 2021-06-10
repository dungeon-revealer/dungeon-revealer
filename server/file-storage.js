"use strict";

const once = require("lodash/once");
const path = require("path");
const fs = require("fs-extra");
const { randomUUID } = require("crypto");

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
  const transformRecord = ({ id, title, created_at: createdAt, path }) => ({
    id,
    title,
    createdAt,
    path,
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
        "path",
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
        "path",
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

  const getUpdateTitleWhereIdStatement = lazy(() =>
    db.prepare(`
      UPDATE "file_uploads"
      SET
        "title" = ?
      WHERE
        "id" = ?
      ;
    `)
  );

  const updateTitleWhereId = (id, title) =>
    getUpdateTitleWhereIdStatement().then((statement) =>
      statement.get(title, id)
    );

  return {
    createFileUploadRecord,
    selectManyOffset,
    selectPath,
    selectRecordById,
    deleteRecordById,
    updateTitleWhereId,
  };
};

class FileStorage {
  constructor({ dataDirectory, db }) {
    this._storageDirectoryPath = path.join(dataDirectory, "files");
    this._db = createDatabaseInterface(db);
    fs.mkdirpSync(this._storageDirectoryPath);
  }

  async store({ fileName: originalFileName, filePath, fileExtension }) {
    const id = randomUUID();
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

    const record = await this.getById(id);

    return record;
  }

  async list(offset) {
    const records = await this._db.selectManyOffset({ offset });
    return records;
  }

  async getById(id) {
    const record = await this._db.selectRecordById(id);
    return record;
  }

  async deleteById(id) {
    const file = await this.getById(id);
    if (!file) return;
    await fs.unlink(
      path.resolve(path.join(this._storageDirectoryPath, file.path))
    );
    await this._db.deleteRecordById(id);
  }

  async updateById(id, { title }) {
    if (title !== undefined) {
      await this._db.updateTitleWhereId(id, title);
    }
    const record = await this.getById(id);
    return record;
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
