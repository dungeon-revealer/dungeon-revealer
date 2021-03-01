import os from "os";
import * as lib from "./token-image-db";
import { initialize } from "./database";

export const prepareDB = () =>
  initialize({ dataPath: os.tmpdir(), databasePath: ":memory:" });

test("can create and query a token record", async () => {
  const db = await prepareDB();
  const tokenId = await lib.createTokenImage({
    sha256: "69",
    fileExtension: "jpeg",
  })({
    db,
  })();
  expect(tokenId).toEqual(1);
  let record = await lib.getTokenById(1)({ db })();
  expect(record).toMatchObject({
    id: 1,
    sha256: "69",
    extension: "jpeg",
    createdAt: expect.any(Number),
  });
  record = (await lib.getTokenImageBySHA256("69")({ db })())!;
  expect(record).toMatchObject({
    id: 1,
    sha256: "69",
    extension: "jpeg",
    createdAt: expect.any(Number),
  });
});
