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
const fs = require("fs");
const server = (app.http = require("http").createServer(app));
const io = require("socket.io")(server);
const busboy = require("connect-busboy");
const basicAuth = require("express-basic-auth");
const { Maps } = require("./maps");
const { Settings } = require("./settings");

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

/* Images have to be uploaded outside of the code directory to account for 
the case where the application has been bundled up into an executable */
/* It would not surprise me at all if there was some weirdness with where 
it creates the upload directory, either when run from a certain location or 
run in a certain way (e.g. docker or node) */
const UPLOADS_DIR = path.join(process.cwd(), "./uploads/");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

app.use(busboy());

// Not sure if this is needed, Chrome seems to grab the favicon just fine anyway
// Maybe for cross-browser support
app.use(logger("dev"));
app.use(favicon(__dirname + "/build/favicon.ico"));

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
        message: `Map with id '${
          req.params.id
        }' does not have a map image yet.`,
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
        message: `Map with id '${
          req.params.id
        }' does not have a fog image yet.`,
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
        message: `Map with id '${
          req.params.id
        }' does not have a fog image yet.`,
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

  const imageData = req.body.image.replace(/^data:image\/png;base64,/, "");
  maps.updateFogProgressImage(req.params.id, imageData).then(map => {
    res.json({ success: true, data: map });
  });
});

app.post("/map/:id/send", authMiddleware, (req, res) => {
  const map = maps.get(req.params.id);
  if (!map) {
    return res.send(404);
  }
  const imageData = req.body.image.replace(/^data:image\/png;base64,/, "");

  maps.updateFogLiveImage(req.params.id, imageData).then(map => {
    settings.set("currentMapId", map.id);
    res.json({ success: true, data: map });

    io.emit("map update", {
      mapId: map.id,
      image: req.body.image
    });
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
  const currentMapId = settings.get("currentMapId");

  if (currentMapId) {
    console.log("sending current map to newly connected user");

    socket.emit("map update", {
      mapId: currentMapId
    });
  }

  socket.once("disconnect", function() {
    console.log("a user disconnected");
  });
});

function decodeBase64Image(dataString) {
  const matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  const response = {};

  if (matches.length !== 3) {
    return new Error("Invalid input string");
  }

  response.type = matches[1];
  response.data = new Buffer(matches[2], "base64");

  return response;
}

function deleteExistingMapFilesSync() {
  fs.readdirSync(UPLOADS_DIR)
    .filter(function(file) {
      return file.indexOf("map.") > -1;
    })
    .forEach(function(file) {
      const filePath = path.join(UPLOADS_DIR + file);
      console.log("Deleting old map " + filePath);
      fs.unlinkSync(filePath);
    });
}

module.exports = app;
