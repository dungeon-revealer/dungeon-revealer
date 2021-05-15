import * as t from "io-ts";
import * as RT from "fp-ts/lib/ReaderTask";
import { Buffer } from "buffer";
import { pipe } from "fp-ts/lib/function";
import type { Database } from "sqlite";
import * as sql from "./sql";
import { applyDecoder } from "./apply-decoder";

const getTimestamp = () => new Date().getTime();

const TokenId = t.number;

const buffer = new t.Type(
  "Buffer",
  Buffer.isBuffer,
  (value, context) =>
    Buffer.isBuffer(value)
      ? t.success(value)
      : t.failure(value, context, "Expected Buffer."),
  (value) => value
);

export const TokenImageModel = t.type(
  {
    id: t.number,
    title: t.string,
    sha256: buffer,
    extension: t.string,
    createdAt: t.number,
  },
  "TokenImageModel"
);

export const TokenImageListModel = t.array(TokenImageModel, "TokenImageList");

const MaybeTokenImageModal = t.union(
  [TokenImageModel, t.null, t.undefined],
  "MaybeTokenImageModal"
);

export type TokenImageType = t.TypeOf<typeof TokenImageModel>;

export type Dependencies = {
  db: Database;
};

export const getTokenImageBySHA256 = (sha256: string) =>
  pipe(
    RT.ask<Dependencies>(),
    RT.chainW(
      (deps) => () => () =>
        deps.db.get(
          /* SQL */ `
          SELECT
            "id",
            "title",
            "sha256",
            "extension",
            "createdAt"
          FROM
            "tokenImages"
          WHERE
            "sha256" = $sha256
          `,
          {
            $sha256: Buffer.from(sha256, "hex"),
          }
        )
    ),
    RT.chainW(applyDecoder(MaybeTokenImageModal))
  );

export const getTokenById = (id: number) =>
  pipe(
    RT.ask<Dependencies>(),
    RT.chainW(
      (deps) => () => () =>
        deps.db.get(
          /* SQL */ `
          SELECT
            "id",
            "title",
            "sha256",
            "extension",
            "createdAt"
          FROM
            "tokenImages"
          WHERE
            "id" = $id
        `,
          { $id: id }
        )
    ),
    RT.chainW(applyDecoder(TokenImageModel))
  );

export const createTokenImage = (params: {
  title: string;
  sha256: string;
  sourceSha256: string | null;
  fileExtension: string;
}) =>
  pipe(
    RT.ask<Dependencies>(),
    RT.chainW(
      (deps) => () => () =>
        deps.db.run(
          /* SQL */ `
          INSERT INTO "tokenImages" (
            "title",
            "sha256",
            "sourceSha256",
            "extension",
            "createdAt"
          )
          VALUES
          (
            $title,
            $sha256,
            $sourceSha256,
            $extension,
            $createdAt
          )
        `,
          {
            $title: params.title,
            $sha256: Buffer.from(params.sha256, "hex"),
            $sourceSha256:
              params.sourceSha256 === null
                ? null
                : Buffer.from(params.sourceSha256, "hex"),
            $extension: params.fileExtension,
            $createdAt: getTimestamp(),
          }
        )
    ),
    RT.map((result) => result.lastID),
    RT.chain(applyDecoder(TokenId))
  );

export type GetPaginatedTokenImagesParameter = {
  first: number;
  sourceSha256: string | null;
  titleFilter: string | null;
  cursor: {
    lastCreatedAt: number;
    lastId: number;
  } | null;
};

export const getPaginatedTokenImages = (
  params: GetPaginatedTokenImagesParameter
) =>
  pipe(
    RT.ask<Dependencies>(),
    RT.chainW(
      (deps) => () => () =>
        deps.db.all(
          /* SQL */ `
          SELECT
            "id",
            "title",
            "sha256",
            "extension",
            "createdAt"
          FROM
            "tokenImages"
          ${sql.whereAnd(
            params.sourceSha256 ? `"sourceSha256" = $sourceSha256` : null,
            params.titleFilter ? `"title" LIKE $titleFilter` : null,
            params.cursor
              ? `("createdAt" < $lastCreatedAt OR ("createdAt" = $lastCreatedAt AND "id" < $lastId))`
              : null
          )}
          ORDER BY
            "createdAt" DESC,
            "id" DESC
          LIMIT $first
        `,
          {
            $first: params.first,
            $sourceSha256: params.sourceSha256
              ? Buffer.from(params.sourceSha256, "hex")
              : undefined,
            $titleFilter: params.titleFilter
              ? `%${params.titleFilter}%`
              : undefined,
            $lastCreatedAt: params.cursor?.lastCreatedAt,
            $lastId: params.cursor?.lastId,
          }
        )
    ),
    RT.chain(applyDecoder(TokenImageListModel))
  );
