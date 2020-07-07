import * as express from "express";
import * as fs from "fs";
import * as unzipper from "unzipper";
import type { Database } from "sqlite";
import * as notes from "../notes-lib";

export default ({ db }: { db: Database }) => {
  const router = express.Router();

  router.post("/notes/import", (request, response) => {
    request.pipe(request.busboy);

    let hasFile = false;

    request.busboy.once(
      "file",
      (fieldname: string, file: fs.ReadStream, filename) => {
        hasFile = true;
        file
          .pipe(unzipper.Parse())
          .on("entry", (entry: unzipper.File) => {
            if (entry.type === "File" && entry.path.endsWith(".md")) {
              const chunks = [] as Uint8Array[];
              // @ts-ignore
              entry.on("data", (chunk) => {
                chunks.push(chunk);
              });
              // @ts-ignore
              entry.on("end", () => {
                const noteContents = Buffer.concat(chunks).toString();
                // TODO: write result to logs/stream to client
                notes
                  .importNote(noteContents)({ db })()
                  .then((a) => {
                    response.write("\n try writing record...");
                  });
              });
            } else {
              // @ts-ignore
              entry.autodrain();
            }
          })
          .on("finish", () => {
            response.end("Ok.");
          });
      }
    );

    request.once("finish", () => {
      if (hasFile) {
        return;
      }
      response.status(422).json({ data: null, error: "No file was sent." });
    });
  });

  return router;
};
