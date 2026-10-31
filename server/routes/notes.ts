import * as express from "express";
import * as fs from "fs-extra";
import * as unzipper from "unzipper";
import type { Database } from "sqlite";
import * as notes from "../notes-lib";
import { flow } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RT from "fp-ts/lib/ReaderTask";
import * as util from "../util";
import { iterateStream } from "../iterate-stream";
import { Readable } from "stream";

type ImportNoteResult =
  | {
      data: null;
      error: {
        code: string;
        message: string;
      };
    }
  | { data: { message: string }; error: null };

const importNoteWithReport = (name: string) =>
  flow(
    notes.importNote,
    RTE.fold(
      (err) => {
        return RT.of({
          data: null,
          error: {
            code: "FAILED_IMPORT",
            message: `Failed importing '${name}': ` + err.message,
          },
        } as ImportNoteResult);
      },
      () => {
        return RT.of({
          data: { message: `Successfully imported ${name}.` },
          error: null,
        } as ImportNoteResult);
      }
    )
  );

/**
 * Upper bound applied to every note this route buffers. connect-busboy is
 * mounted without `limits`, so busboy's own `fileSize` and `parts` defaults
 * are Infinity and an uploaded part is as large as the client cares to make
 * it; the bound therefore has to be enforced here, where the bytes are kept.
 */
const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export class ImportTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Import exceeds the ${maxBytes} byte limit.`);
    this.name = "ImportTooLargeError";
  }
}

export const resolveStreamContentString = (
  input: Readable,
  maxBytes: number = MAX_IMPORT_BYTES
) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    let settled = false;
    input.on("data", (chunk: Uint8Array) => {
      if (settled) {
        return;
      }
      bytes += chunk.length;
      if (bytes > maxBytes) {
        settled = true;
        chunks.length = 0;
        reject(new ImportTooLargeError(maxBytes));
        return;
      }
      chunks.push(chunk);
    });
    input.on("end", () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(Buffer.concat(chunks).toString());
    });
    input.on("error", (err) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(err);
    });
  });

type RoleMiddleware = {
  dm: express.RequestHandler;
  pc: express.RequestHandler;
};

type Dependencies = {
  db: Database;
  roleMiddleware: RoleMiddleware;
};

export default ({ db, roleMiddleware }: Dependencies) => {
  const router = express.Router();

  router.post("/notes/import", roleMiddleware.dm, (request, response) => {
    request.setTimeout(0);
    request.pipe(request.busboy);

    let hasFile = false;

    request.busboy.once(
      "file",
      (fieldname: string, file: fs.ReadStream, info: any) => {
        const filename = info.filename;
        hasFile = true;
        let amountOfImportedRecords = 0;
        let amountOfFailedRecords = 0;

        if (filename.endsWith(".md")) {
          const chunks = [] as Uint8Array[];
          let bytes = 0;
          let tooLarge = false;
          file.on("data", (chunk) => {
            if (tooLarge) {
              return;
            }
            bytes += chunk.length;
            if (bytes > MAX_IMPORT_BYTES) {
              tooLarge = true;
              chunks.length = 0;
              return;
            }
            chunks.push(
              new Uint8Array(
                typeof chunk === "string" ? Buffer.from(chunk) : chunk
              )
            );
          });

          file.on("end", () => {
            if (tooLarge) {
              response.status(413).json({
                data: null,
                error: {
                  code: "IMPORT_TOO_LARGE",
                  message: `The imported note exceeds the ${MAX_IMPORT_BYTES} byte limit.`,
                },
              });
              return;
            }
            const noteContents = Buffer.concat(chunks).toString();
            importNoteWithReport(filename)(noteContents)({ db })().then(
              (result) => {
                if (result.error === null) {
                  amountOfImportedRecords = amountOfImportedRecords + 1;
                } else {
                  amountOfFailedRecords = amountOfFailedRecords + 1;
                }

                response.write(
                  `\n` +
                    JSON.stringify({
                      amountOfImportedRecords,
                      amountOfFailedRecords,
                      latest: result,
                    })
                );
                response.end();
              }
            );
          });
        } else if (filename.endsWith(".zip")) {
          const tmpFile = util.getTmpFile(".zip");
          file.pipe(fs.createWriteStream(tmpFile)).on("finish", async () => {
            const unzipStream = unzipper.Parse({ forceStream: true });

            const contentIterator = iterateStream<unzipper.Entry>(unzipStream);

            fs.createReadStream(tmpFile).pipe(unzipStream);

            try {
              for await (const entry of contentIterator) {
                if (entry.type === "File" && entry.path.endsWith(".md")) {
                  const noteContents = await resolveStreamContentString(entry);

                  const result = await importNoteWithReport(entry.path)(
                    noteContents
                  )({ db })();
                  if (result.error === null) {
                    amountOfImportedRecords = amountOfImportedRecords + 1;
                  } else {
                    amountOfFailedRecords = amountOfFailedRecords + 1;
                  }
                  response.write(
                    `\n` +
                      JSON.stringify({
                        amountOfImportedRecords,
                        amountOfFailedRecords,
                        latest: result,
                      })
                  );
                } else {
                  entry.autodrain();
                }
              }
              response.end();
            } catch (err) {
              // A single over-large entry must end the request, not the process.
              // An earlier entry may already have written its progress line,
              // which sends the response headers: a status code cannot be set
              // after that (express throws ERR_HTTP_HEADERS_SENT from inside
              // this async handler, and the rejected promise would take the
              // process down). End the response in that case.
              if (response.headersSent) {
                response.end();
              } else if (err instanceof ImportTooLargeError) {
                response.status(413).json({
                  data: null,
                  error: {
                    code: "IMPORT_TOO_LARGE",
                    message: `An entry in the archive exceeds the ${MAX_IMPORT_BYTES} byte limit.`,
                  },
                });
              } else {
                response.status(422).json({
                  data: null,
                  error: {
                    code: "IMPORT_FAILED",
                    message:
                      err instanceof Error ? err.message : "Import failed.",
                  },
                });
              }
            }
            await fs.unlink(tmpFile);
          });
        }
      }
    );

    request.busboy.once("close", () => {
      if (hasFile) {
        return;
      }
      response.status(422).json({ data: null, error: "No file was sent." });
    });
  });

  return router;
};
