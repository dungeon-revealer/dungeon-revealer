import os from "os";
import * as lib from "./token-image-db";
import { initialize } from "./database";

export const prepareDB = () =>
  initialize({ dataPath: os.tmpdir(), databasePath: ":memory:" });

test("can create and query a token record", async () => {
  const db = await prepareDB();
  const deps = { db };
  const tokenId = await lib.createTokenImage({
    title: "a",
    sha256: "69",
    sourceSha256: "187",
    fileExtension: "jpeg",
  })(deps)();
  const token2Id = await lib.createTokenImage({
    title: "b",
    sha256: "31",
    sourceSha256: "666",
    fileExtension: "jpeg",
  })(deps)();
  expect(tokenId).toEqual(1);
  let record = await lib.getTokenById(1)(deps)();
  expect(record).toMatchObject({
    id: 1,
    title: "a",
    sha256: expect.any(Buffer),
    extension: "jpeg",
    createdAt: expect.any(Number),
  });
  record = (await lib.getTokenImageBySHA256("69")({ db })())!;
  expect(record).toMatchObject({
    id: 1,
    title: "a",
    sha256: expect.any(Buffer),
    extension: "jpeg",
    createdAt: expect.any(Number),
  });

  let records = await lib.getPaginatedTokenImages({
    first: 1,
    cursor: null,
    sourceSha256: null,
    titleFilter: null,
  })(deps)();
  expect(records).toHaveLength(1);
  expect(records[0].id).toEqual(2);
  records = await lib.getPaginatedTokenImages({
    first: 1,
    cursor: {
      lastId: records[0].id,
      lastCreatedAt: records[0].createdAt,
    },
    sourceSha256: null,
    titleFilter: null,
  })(deps)();
  expect(records).toHaveLength(1);
  expect(records[0].id).toEqual(1);
  records = await lib.getPaginatedTokenImages({
    first: 10,
    cursor: null,
    sourceSha256: "187",
    titleFilter: null,
  })(deps)();
  expect(records).toHaveLength(1);
  expect(records[0].id).toEqual(1);
});
