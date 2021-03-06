import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import * as E from "fp-ts/Either";
import * as RT from "fp-ts/ReaderTask";
import { Buffer } from "buffer";
import { flow, pipe } from "fp-ts/function";
import type { Database } from "sqlite";

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
    sha256: buffer,
    extension: t.string,
    createdAt: t.number,
  },
  "TokenImageModel"
);

const MaybeTokenImageModal = t.union(
  [TokenImageModel, t.null, t.undefined],
  "MaybeTokenImageModal"
);

export type TokenImageType = t.TypeOf<typeof TokenImageModel>;

export type Dependencies = {
  db: Database;
};

const applyDecoder = <D, T extends t.Type<any, any, any>>(
  type: T
): ((input: unknown) => RT.ReaderTask<D, t.TypeOf<T>>) =>
  flow(
    type.decode,
    E.mapLeft((errors: t.Errors) => {
      const lines = PathReporter.report(E.left(errors));
      return new Error(
        "Invalid schema. \n" + lines.map((line) => `- ${line}`).join("\n")
      );
    }),
    (either) => {
      if (E.isLeft(either)) {
        return RT.fromTask(() => Promise.reject(either.left));
      }
      return RT.fromTask(() => Promise.resolve(either.right));
    }
  );

export const getTokenImageBySHA256 = (sha256: string) =>
  pipe(
    RT.ask<Dependencies>(),
    RT.chainW((deps) => () => () =>
      deps.db.get(
        /* SQL */ `
          SELECT
            "id",
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
    RT.chainW((deps) => () => () =>
      deps.db.get(
        /* SQL */ `
          SELECT
            "id",
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
  sha256: string;
  sourceSha256: string | null;
  fileExtension: string;
}) =>
  pipe(
    RT.ask<Dependencies>(),
    RT.chainW((deps) => () => () =>
      deps.db.run(
        /* SQL */ `
          INSERT INTO "tokenImages" (
            "sha256",
            "sourceSha256",
            "extension",
            "createdAt"
          )
          VALUES
          (
            $sha256,
            $sourceSha256,
            $extension,
            $createdAt
          )
        `,
        {
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
