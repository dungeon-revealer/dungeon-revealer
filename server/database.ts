import * as sqlite3 from "sqlite3";
import * as sqlite from "sqlite";
import * as path from "path";
import * as migration0 from "./migrations/0";
import * as migration1 from "./migrations/1";
import * as migration2 from "./migrations/2";

/**
 * @param {{ dataPath: string }}
 */
const loadDatabase = ({ dataPath }: { dataPath: string }) =>
  sqlite.open({
    filename: path.join(dataPath, `db.sqlite`),
    driver: sqlite3.Database,
  });

const runMigrations = async (
  db: sqlite.Database,
  { dataPath }: { dataPath: string }
) => {
  const result = await db.get(`PRAGMA "user_version";`);
  let userVersion = null;
  if (result) {
    userVersion = result.user_version || 0;
  }
  // eslint-disable-next-line default-case
  switch (userVersion) {
    case 0: {
      await migration0.migrate({ db });
    }
    case 1: {
      await migration1.migrate({ db, dataPath });
    }
    case 2: {
      await migration2.migrate({ db });
    }
  }

  return db;
};

export const initialize = ({ dataPath }: { dataPath: string }) =>
  Promise.resolve()
    .then(() => loadDatabase({ dataPath }))
    .then((db) => runMigrations(db, { dataPath }));
