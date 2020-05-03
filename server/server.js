"use strict";

const express = require("express");
const path = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const bodyParser = require("body-parser");
const createUniqueId = require("uuid/v4");
const fs = require("fs-extra");
const http = require("http");
const createSocketIOServer = require("socket.io");
const busboy = require("connect-busboy");
const createFilesRouter = require("./routes/files");
const createMapRouter = require("./routes/map");
const createNotesRouter = require("./routes/notes");
const { Maps } = require("./maps");
const { Notes } = require("./notes");
const { Settings } = require("./settings");
const { FileStorage } = require("./file-storage");
const { createResourceTaskProcessor } = require("./util");
const database = require("./database");
const env = require("./env");

const bootstrapServer = async () => {
  fs.mkdirpSync(env.DATA_DIRECTORY);

  const db = await database.initialize({ dataPath: env.DATA_DIRECTORY });

  const app = express();
  const apiRouter = express.Router();
  const httpServer = http.createServer(app);
  const io = createSocketIOServer(httpServer, {
    path: "/api/socket.io",
  });

  const processTask = createResourceTaskProcessor();

  const maps = new Maps({ processTask, dataDirectory: env.DATA_DIRECTORY });
  const notes = new Notes({ dataDirectory: env.DATA_DIRECTORY });
  const settings = new Settings({ dataDirectory: env.DATA_DIRECTORY });
  const fileStorage = new FileStorage({
    dataDirectory: env.DATA_DIRECTORY,
    db,
  });

  app.use(busboy());

  // Not sure if this is needed, Chrome seems to grab the favicon just fine anyway
  // Maybe for cross-browser support
  app.use(logger("dev"));
  app.use(favicon(path.resolve(env.PUBLIC_PATH, "favicon.ico")));

  // Needed to handle JSON posts, size limit of 50mb
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

  const getRole = (password) => {
    let role = null;
    if (env.PC_PASSWORD) {
      if (password === env.PC_PASSWORD) {
        role = "PC";
      }
    } else {
      role = "PC";
    }
    if (env.DM_PASSWORD) {
      if (password === env.DM_PASSWORD) {
        role = "DM";
      }
    } else {
      role = "DM";
    }
    return role;
  };

  const authorizationMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const authParam = req.query.authorization;
    let token = null;

    if (authHeader) {
      token = req.headers.authorization.split(" ")[1];
    } else if (authParam) {
      token = authParam;
    }

    req.role = getRole(token);
    next();
  };

  const requiresPcRole = (req, res, next) => {
    if (req.role === "DM" || req.role === "PC") {
      next();
      return;
    }
    res.status(401).json({
      data: null,
      error: {
        message: "Unauthenticated Access",
        code: "ERR_UNAUTHENTICATED_ACCESS",
      },
    });
  };

  const requiresDmRole = (req, res, next) => {
    if (req.role === "DM") {
      next();
      return;
    }
    res.status(401).json({
      data: null,
      error: {
        message: "Unauthenticated Access",
        code: "ERR_UNAUTHENTICATED_ACCESS",
      },
    });
  };

  const roleMiddleware = {
    dm: requiresDmRole,
    pc: requiresPcRole,
  };

  app.use(authorizationMiddleware);

  apiRouter.get("/auth", (req, res) => {
    return res.status(200).json({
      data: {
        role: req.role,
      },
    });
  });

  apiRouter.get("/active-map", requiresPcRole, (req, res) => {
    let activeMap = null;
    const activeMapId = settings.get("currentMapId");
    if (activeMapId) {
      activeMap = maps.get(activeMapId);
    }

    res.status(200).json({
      error: null,
      data: {
        activeMap,
      },
    });
  });

  apiRouter.post("/active-map", requiresDmRole, (req, res) => {
    const mapId = req.body.mapId;
    if (mapId === undefined) {
      res.status(404).json({
        error: {
          message: "Missing param 'mapId' in body.",
          code: "ERR_MISSING_MAP_ID",
        },
      });
      return;
    }

    settings.set("currentMapId", mapId);

    io.emit("map update", {
      map: null,
    });

    res.json({
      error: null,
      data: {
        activeMapId: mapId,
      },
    });
  });

  const { router: mapsRouter } = createMapRouter({
    roleMiddleware,
    maps,
    settings,
    io,
  });
  const { router: notesRouter } = createNotesRouter({
    roleMiddleware,
    settings,
    notes,
    maps,
    io,
  });
  const { router: fileRouter } = createFilesRouter({
    roleMiddleware,
    fileStorage,
  });

  apiRouter.use(mapsRouter);
  apiRouter.use(notesRouter);
  apiRouter.use(fileRouter);

  app.use("/api", apiRouter);

  const indexHtml = path.join(env.PUBLIC_PATH, "index.html");
  const indexHtmlContent = fs
    .readFileSync(indexHtml, "utf-8")
    .replace(/__PUBLIC_URL_PLACEHOLDER__/g, env.PUBLIC_URL);

  app.get("/", (req, res) => {
    res.send(indexHtmlContent);
  });

  app.get("/dm", (req, res) => {
    res.send(indexHtmlContent);
  });

  // Consider all URLs under /public/ as static files, and return them raw.
  app.use(express.static(path.join(env.PUBLIC_PATH)));

  // catch 404 and forward to error handler
  app.use((req, res, next) => {
    const err = new Error("Not Found");
    err.status = 404;
    next(err);
  });

  // error handlers

  // development error handler
  // will print stacktrace
  if (app.get("env") === "development") {
    app.use((err, req, res) => {
      res.status(err.status || 500);
      res.render("error", {
        message: err.message,
        error: err,
      });
    });
  }

  // production error handler
  // no stacktraces leaked to user
  app.use((err, req, res) => {
    console.log(err);
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: {},
    });
  });

  const authenticatedSockets = new Set();

  io.on("connection", (socket) => {
    console.log(`WS client ${socket.handshake.address} ${socket.id} connected`);

    socket.on("auth", ({ password }) => {
      socket.removeAllListeners();

      const role = getRole(password);
      if (role === null) {
        console.log(
          `WS ${socket.handshake.address} ${socket.id} client authenticate failed`
        );
        return;
      }

      console.log(
        `WS client ${socket.handshake.address} ${socket.id} authenticate ${role}`
      );

      authenticatedSockets.add(socket);

      socket.on("mark area", (data) => {
        Array.from(authenticatedSockets).forEach((socket) => {
          socket.emit("mark area", {
            id: createUniqueId(),
            ...data,
          });
        });
      });

      if (role !== "DM") return;

      socket.on("remove token", (message) => {
        Array.from(authenticatedSockets).forEach((socket) => {
          socket.emit("remove token", message);
        });
      });

      socket.on("share image", (message) => {
        Array.from(authenticatedSockets).forEach((socket) => {
          socket.emit("share image", message);
        });
      });
    });

    socket.once("disconnect", function () {
      authenticatedSockets.delete(socket);
    });
  });

  return { app, httpServer, io };
};

module.exports = { bootstrapServer };
