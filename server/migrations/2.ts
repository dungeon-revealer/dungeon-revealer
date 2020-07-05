import * as sqlite from "sqlite";

export const migrate = async ({ db }: { db: sqlite.Database }) => {
  await db.exec(/* SQL */ `
    BEGIN;
    PRAGMA "user_version" = 3;
    ALTER TABLE "notes"
      ADD COLUMN "type" TEXT DEFAULT 'admin'
    ;
    ALTER TABLE "notes"
      ADD COLUMN "is_entry_point" INTEGER DEFAULT 0 
    ;
    UPDATE "notes"
    SET
      "is_entry_point" = 1
    ;
    CREATE INDEX "notes_desc_created_at_desc_id" ON "notes" (
      created_at DESC,
      id DESC
    );
    CREATE VIRTUAL TABLE "notes_search" USING fts5(
      "id" UNINDEXED,
      "title",
      "content",
      "access"
    );
    COMMIT;
  `);
};
