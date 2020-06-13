import * as sqlite from "sqlite";

export const migrate = async ({ db }: { db: sqlite.Database }) => {
  await db.exec(/* SQL */ `
    BEGIN;
    PRAGMA "user_version" = 1;
    CREATE TABLE "file_uploads" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "path" TEXT NOT NULL,
      "created_at" INT NOT NULL
    );
    COMMIT;
  `);
};
