import * as sqlite from "sqlite";

export const migrate = async (deps: { db: sqlite.Database }) => {
  await deps.db.exec(/* SQL */ `
    BEGIN;
    PRAGMA "user_version" = 4;
    CREATE TABLE "tokenImages" (
      "id" INTEGER NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "sha256" BLOB NOT NULL,
      "sourceSha256" BLOB,
      "extension" TEXT NOT NULL,
      "createdAt" INT NOT NULL
    );
    CREATE UNIQUE INDEX "index_tokenImages_sha256" ON "tokenImages" ("sha256");
    COMMIT;
  `);
};
