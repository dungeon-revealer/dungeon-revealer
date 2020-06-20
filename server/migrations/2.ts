import * as sqlite from "sqlite";

export const migrate = async ({ db }: { db: sqlite.Database }) => {
  await db.exec(/* SQL */ `
    BEGIN;
    PRAGMA "user_version" = 3;
    ALTER TABLE "notes"
      ADD COLUMN "type" TEXT DEFAULT 'admin'
    ;
    CREATE VIRTUAL TABLE "notes_search_public" USING fts5(
      "id" UNINDEXED,
      "title",
      "content"
    );
    COMMIT;
  `);
};
