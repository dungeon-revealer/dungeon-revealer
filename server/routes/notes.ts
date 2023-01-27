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

export const resolveStreamContentString = (input: Readable) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    input.on("data", (chunk) => {
      chunks.push(chunk);
    });
    input.on("end", () => {
      const content = Buffer.concat(chunks).toString();
      resolve(content);
    });
    input.on("error", (err) => {
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
          file.on("data", (chunk) => {
            chunks.push(
              new Uint8Array(
                typeof chunk === "string" ? Buffer.from(chunk) : chunk
              )
            );
          });

          file.on("end", () => {
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
