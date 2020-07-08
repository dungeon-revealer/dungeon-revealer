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

const importNoteWithReport = (name: string) =>
  flow(
    notes.importNote,
    RTE.fold(
      (err) => {
        console.log(`note-import error ${name}`);
        return RT.of(null);
      },
      () => {
        console.error(`note-import success ${name}`);
        return RT.of(null);
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

export default ({ db }: { db: Database }) => {
  const router = express.Router();

  router.post("/notes/import", (request, response) => {
    request.setTimeout(0);
    request.pipe(request.busboy);

    let hasFile = false;

    request.busboy.once("file", (_, file: fs.ReadStream, filename: string) => {
      hasFile = true;
      let amountOfImportedRecords = 0;
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
          importNoteWithReport("Single File")(noteContents)({ db })().then(
            () => {
              amountOfImportedRecords = amountOfImportedRecords + 1;
              response.write(
                `\n` + JSON.stringify({ amountOfImportedRecords })
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

              await importNoteWithReport(entry.path)(noteContents)({ db })();
              amountOfImportedRecords = amountOfImportedRecords + 1;
              response.write(
                `\n` + JSON.stringify({ amountOfImportedRecords })
              );
            } else {
              entry.autodrain();
            }
          }
          response.end();
          await fs.unlink(tmpFile);
        });
      }
    });

    request.busboy.once("finish", () => {
      if (hasFile) {
        return;
      }
      response.status(422).json({ data: null, error: "No file was sent." });
    });
  });

  return router;
};
