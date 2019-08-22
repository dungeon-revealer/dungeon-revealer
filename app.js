"use strict";

const express = require("express");
const app = express();
const path = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("cookie-session");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const createUniqueId = require("uuid/v4");
const fs = require("fs-extra");
const os = require("os");
const server = (app.http = require("http").createServer(app));
const io = require("socket.io")(server);
const busboy = require("connect-busboy");
const basicAuth = require("express-basic-auth");
const { Maps } = require("./maps");
const { Settings } = require("./settings");
const { getDataDirectory } = require("./util");

fs.mkdirpSync(getDataDirectory());

const maps = new Maps();
const settings = new Settings();

const authMiddleware = basicAuth({
  challenge: true,
  authorizer: function(user, password) {
    if (process.env.DM_PASSWORD) {
      return password === process.env.DM_PASSWORD;
    }
    return true;
  }
});

// Used to generate session keys
const generateKey = () => {
  const sha = crypto.createHash("sha256");
  sha.update(Math.random().toString());
  return sha.digest("hex");
};

app.use(busboy());

// Not sure if this is needed, Chrome seems to grab the favicon just fine anyway
// Maybe for cross-browser support
app.use(logger("dev"));
app.use(favicon(path.resolve(__dirname, "build", "favicon.ico")));

// Needed to handle JSON posts, size limit of 50mb
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Cookie parsing needed for sessions
app.use(cookieParser());

// Session framework
// not implemented
app.use(session({ secret: generateKey() }));

app.get("/map/:id/map", (req, res) => {
  const map = maps.get(req.params.id);
  if (!map) {
    return res.status(404).json({
      data: null,
      error: {
        message: `Map with id '${req.params.id}' does not exist.`,
        code: "ERR_MAP_DOES_NOT_EXIST"
      }
    });
  } else if (!map.mapPath) {
    return res.status(404).json({
      data: null,
      error: {
        message: `Map with id '${req.params.id}' does not have a map image yet.`,
        code: "ERR_MAP_NO_IMAGE"
      }
    });
  }

  const basePath = maps.getBasePath(map);

  return res.sendFile(path.join(basePath, map.mapPath));
});

app.get("/map/:id/fog", (req, res) => {
  const map = maps.get(req.params.id);
  if (!map) {
    return res.status(404).json({
      data: null,
      error: {
        message: `Map with id '${req.params.id}' does not exist.`,
        code: "ERR_MAP_DOES_NOT_EXIST"
      }
    });
  } else if (!map.fogProgressPath) {
    return res.status(404).json({
      data: null,
      error: {
        message: `Map with id '${req.params.id}' does not have a fog image yet.`,
        code: "ERR_MAP_NO_FOG"
      }
    });
  }
  return res.sendFile(path.join(maps.getBasePath(map), map.fogProgressPath));
});

app.get("/map/:id/fog-live", (req, res) => {
  const map = maps.get(req.params.id);
  if (!map) {
    return res.status(404).json({
      data: null,
      error: {
        message: `Map with id '${req.params.id}' does not exist.`,
        code: "ERR_MAP_DOES_NOT_EXIST"
      }
    });
  } else if (!map.fogLivePath) {
    return res.status(404).json({
      data: null,
      error: {
        message: `Map with id '${req.params.id}' does not have a fog image yet.`,
        code: "ERR_MAP_NO_FOG"
      }
    });
  }
  return res.sendFile(path.join(maps.getBasePath(map), map.fogLivePath));
});

app.post("/map/:id/map", authMiddleware, (req, res) => {
  const map = maps.get(req.params.id);
  if (!map) {
    return res.send(404);
  }
  req.pipe(req.busboy);
  req.busboy.once("file", (fieldname, file, filename) => {
    const extension = filename.split(".").pop();
    maps
      .updateMapImage(req.params.id, { fileStream: file, extension })
      .then(map => {
        res.json({ success: true, data: map });
      })
      .catch(err => {
        res.status(404).json({ data: null, error: err });
      });
  });
});

app.post("/map/:id/fog", authMiddleware, (req, res) => {
  const map = maps.get(req.params.id);
  if (!map) {
    return res.send(404);
  }

  req.pipe(req.busboy);
  req.busboy.once("file", (fieldname, file, filename) => {
    maps.updateFogProgressImage(req.params.id, file).then(map => {
      res.json({ success: true, data: map });
    });
  });
});

app.post("/map/:id/send", authMiddleware, (req, res) => {
  const map = maps.get(req.params.id);
  if (!map) {
    return res.send(404);
  }
  req.pipe(req.busboy);
  req.busboy.once("file", (fieldname, file, filename) => {
    maps.updateFogLiveImage(req.params.id, file).then(map => {
      settings.set("currentMapId", map.id);
      res.json({ success: true, data: map });
      io.emit("map update", {
        map,
        image: req.body.image
      });
    });
  });
});

app.delete("/map/:id", authMiddleware, (req, res) => {
  const map = maps.get(req.params.id);
  if (!map) {
    return res.send(404);
  }

  maps.deleteMap(map.id);

  res.status(200).json({
    success: true
  });
});

app.get("/active-map", authMiddleware, (req, res) => {
  let activeMap = null;
  const activeMapId = settings.get("currentMapId");
  if (activeMapId) {
    activeMap = maps.get(activeMapId);
  }

  return res.status(200).json({
    success: true,
    data: {
      activeMap
    }
  });
});

app.post("/active-map", authMiddleware, (req, res) => {
  const mapId = req.body.mapId;
  if (mapId === undefined) {
    res.status(404).json({
      error: {
        message: "Missing param 'mapId' in body.",
        code: "ERR_MISSING_MAP_ID"
      }
    });
  }
  settings.set("currentMapId", mapId);
  io.emit("map update", {
    map: null,
    image: null
  });
  res.json({
    success: true
  });
});

app.get("/map", authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      currentMapId: settings.get("currentMapId"),
      maps: maps.getAll()
    }
  });
});

app.post("/map", (req, res) => {
  req.pipe(req.busboy);

  const data = {};

  req.busboy.on("file", (fieldname, stream, filename) => {
    const extension = filename.split(".").pop();
    const saveTo = path.join(os.tmpDir(), path.basename(fieldname));
    data.file = {
      path: saveTo,
      extension
    };
    stream.pipe(fs.createWriteStream(saveTo));
  });
  req.busboy.on("field", (fieldname, value) => {
    if (fieldname === "title") {
      data[fieldname] = value;
    }
  });

  req.busboy.on("finish", () => {
    const map = maps.createMap(data);
    res.status(200).json({ success: true, data: { map } });
  });
});

app.patch("/map/:id", authMiddleware, (req, res) => {
  let map = maps.get(req.params.id);
  if (!map) {
    return res.status(404).json({
      success: false,
      data: null,
      error: {
        message: `Map with id '${req.params.id}' does not exist.`,
        code: "ERR_MAP_DOES_NOT_EXIST"
      }
    });
  }
  const updates = {};

  if (req.body.title) {
    updates.title = req.body.title;
  }
  if (req.body.grid) {
    updates.grid = req.body.grid;
    updates.showGrid = true;
  }
  if ({}.hasOwnProperty.call(req.body, "showGrid")) {
    updates.showGrid = req.body.showGrid;
  }
  if ({}.hasOwnProperty.call(req.body, "showGridToPlayers")) {
    updates.showGridToPlayers = req.body.showGridToPlayers;
  }
  if ({}.hasOwnProperty.call(req.body, "gridColor")) {
    updates.gridColor = req.body.gridColor;
  }

  if (Object.keys(updates).length) {
    map = maps.updateMapSettings(map.id, updates);
  }

  res.json({
    success: true,
    data: {
      map
    }
  });
});

app.get("/", function(req, res) {
  res.sendfile("/build/index.html", { root: __dirname });
});

app.get("/dm", authMiddleware, function(req, res) {
  res.sendfile("/build/index.html", { root: __dirname });
});

// Consider all URLs under /public/ as static files, and return them raw.
app.use(express.static(path.join(__dirname, "build")));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
  console.log(err);
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: {}
  });
});

io.on("connection", function(socket) {
  socket.once("disconnect", function() {
    console.log("a user disconnected");
  });

  socket.on("mark area", msg => {
    io.emit("mark area", {
      id: createUniqueId(),
      ...msg
    });
  });

  socket.on("add token", msg => {
    io.emit("add token", {
      ...msg
    });
  });

  socket.on("remove token", msg => {
    io.emit("remove token", {
      ...msg
    });
  });
});

module.exports = app;
