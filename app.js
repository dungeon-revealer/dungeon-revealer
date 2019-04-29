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

let mostRecentImageData = null;
let mostRecentRawImagePath = null;

/* Images have to be uploaded outside of the code directory to account for 
the case where the application has been bundled up into an executable */
/* It would not surprise me at all if there was some weirdness with where 
it creates the upload directory, either when run from a certain location or 
run in a certain way (e.g. docker or node) */
const UPLOADS_DIR = path.join(process.cwd(), "../uploads/");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}
const GENERATED_IMAGE_PATH = path.join(UPLOADS_DIR + "generatedMap.png");

app.use(busboy());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Not sure if this is needed, Chrome seems to grab the favicon just fine anyway
// Maybe for cross-browser support
app.use(favicon(__dirname + "/public/favicon.ico"));
app.use(logger("dev"));

// Needed to handle JSON posts, size limit of 50mb
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Cookie parsing needed for sessions
app.use(cookieParser());

// Consider all URLs under /public/ as static files, and return them raw.
app.use(express.static(path.join(__dirname, "public")));

// Session framework
// not implemented
app.use(session({ secret: generateKey() }));

// Routes
// TODO: Move interior logic somewhere else
app.get("/", function(req, res) {
  res.render("player", { dm: false, title: "Dungeon Revealer" });
});

app.get("/dm", authMiddleware, function(req, res) {
  res.render("dm", { dm: true, title: "Dungeon Revealer DM Console" });
});

app.get("/map", function(req, res) {
  res.sendFile(GENERATED_IMAGE_PATH);
});

app.get("/dm/map", authMiddleware, function(req, res) {
  let mapSent = false;
  if (mostRecentRawImagePath) {
    res.sendFile(mostRecentRawImagePath);
    mapSent = true;
  } else {
    console.log("Uploading image to " + UPLOADS_DIR);
    // Look in the dir for a file named map.* and return the first one found
    // Because we are deleting the previous files on upload this logic is mostly useless now
    fs.readdirSync(UPLOADS_DIR)
      .filter(function(file) {
        return file.indexOf("map.") > -1;
      })
      .forEach(function(file) {
        const filePath = path.join(UPLOADS_DIR + file);
        if (!mapSent) {
          mapSent = true;
          mostRecentRawImagePath = filePath;
          res.sendFile(mostRecentRawImagePath);
        }
      });
  }

  if (!mapSent) {
    res.sendStatus(404);
  }
});

// For DM map uploads. These are the raw images without any fog of war.
app.post("/upload", function(req, res) {
  req.pipe(req.busboy);

  req.busboy.on("file", function(fieldname, file, filename) {
    const fileExtension = filename.split(".").pop();
    const uploadedImageSavePath = path.join(
      UPLOADS_DIR,
      "map." + fileExtension
    );
    deleteExistingMapFilesSync();

    const fstream = fs.createWriteStream(uploadedImageSavePath);

    file.pipe(fstream);
    fstream.on("close", function() {
      console.log("map uploaded");
      mostRecentRawImagePath = uploadedImageSavePath;
      res.sendStatus(200);
    });
    // should do something for a failure as well
  });
});

// For the DM sending out fogged maps to be distributed to players
app.post("/send", function(req, res) {
  const imageDataString = req.body.imageData;

  if (imageDataString) {
    const imageData = decodeBase64Image(imageDataString).data;

    fs.writeFile(GENERATED_IMAGE_PATH, imageData, function() {
      console.log("sent map saved");
    });

    // Cache the data for future requests
    mostRecentImageData = imageDataString;

    // ACK for DM
    res.json({
      success: true,
      responseText: "Image successfully uploaded"
    });

    // Send the map update to players
    io.emit("map update", {
      imageData: imageDataString
    });
  } else {
    res.json({
      success: false,
      responseText: "Image not uploaded successfully"
    });
  }
});

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
  console.log("a user connected");

  if (mostRecentImageData) {
    console.log("sending current map to newly connected user");
    socket.emit("map update", {
      imageData: mostRecentImageData
    });
  }

  socket.on("disconnect", function() {
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
