import * as sqlite from "sqlite";
import * as fs from "fs-extra";
import * as path from "path";

export const migrate = async ({
  db,
  dataPath,
}: {
  db: sqlite.Database;
  dataPath: string;
}) => {
  await db.exec(/* SQL */ `
    BEGIN;
    PRAGMA "user_version" = 2;
    CREATE TABLE "notes" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "created_at" INT NOT NULL,
      "updated_at" INT NOT NULL
    );
  `);

  const recordInsertQuery = /* SQL */ `
    INSERT INTO "notes" (
      "id",
      "title",
      "content",
      "created_at",
      "updated_at"
    ) VALUES (?, ?, ?, ?, ?);
  `;

  const legacyNoteDirectory = path.join(dataPath, "notes");
  if (fs.existsSync(legacyNoteDirectory)) {
    const noteFileNames = fs
      .readdirSync(legacyNoteDirectory)
      .filter((fileName) => fileName.endsWith(".json"));
    for (const noteFileName of noteFileNames) {
      const record = fs.readJSONSync(
        path.join(legacyNoteDirectory, noteFileName)
      );
      const content = `# ${record.title}\n\n${record.content}`;
      await db.run(
        recordInsertQuery,
        record.id,
        record.title,
        content,
        new Date(record.createdAt).getTime(),
        new Date(record.updatedAt).getTime()
      );
    }
  }

  await db.run(/* SQL */ `COMMIT;`);
};
