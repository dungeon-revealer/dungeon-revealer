var express = require('express');
var app = express();
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var fs = require('fs');
var http = app.http = require('http').Server(app);
var io = require('socket.io')(http);
var busboy = require('connect-busboy');

// Used to generate session keys
var generateKey = function () {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
};

var mostRecentImageData = null,
    mostRecentRawImagePath = null,
    UPLOADS_DIR = path.join(__dirname, '/public/uploads/'),
    GENERATED_IMAGE_PATH = path.join(UPLOADS_DIR + 'generatedMap.png');


app.use(busboy()); 

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Not sure if this is needed, Chrome seems to grab the favicon just fine anyway
// Maybe for cross-browser support
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));

// Needed to handle JSON posts, size limit of 50mb
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// Cookie parsing needed for sessions
app.use(cookieParser());

// Consider all URLs under /public/ as static files, and return them raw.
app.use(express.static(path.join(__dirname, 'public')));

// Session framework
// not implemented
app.use(session({secret: generateKey()}));

// Routes
// TODO: Move interior logic somewhere else
app.get('/', function (req, res) {
    res.render('player', {dm: false, title: 'Dungeon Revealer'});
});
app.get('/dm', function (req, res) {
    res.render('dm', {dm: true, title: 'Dungeon Revealer DM Console'});
});


app.get('/map', function (req, res) {
    res.sendFile(GENERATED_IMAGE_PATH);
});

app.get('/dm/map', function (req, res) {
    
      var mapSent = false;
      
      if (mostRecentRawImagePath) {
          res.sendFile(mostRecentRawImagePath);
          mapSent = true;
      } else {
          console.log(UPLOADS_DIR);
          // Look in the dir for a file named map.* and return the first one found
          // Because we are deleting the previous files on upload this logic is mostly useless now
          var files = fs.readdirSync(UPLOADS_DIR);
          files.filter(function(file) { 
              return file.indexOf('map.') > -1; 
          }).forEach(function(file) { 
              var filePath = path.join(UPLOADS_DIR + file);
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
app.post('/upload', function (req, res) {

    req.pipe(req.busboy);

    req.busboy.on('file', function (fieldname, file, filename) {

        var fileExtension = filename.split('.').pop(),
            uploadedImageSavePath = path.join(UPLOADS_DIR + 'map.' + fileExtension),
            fstream;
            
        deleteExistingMapFilesSync();
            
        fstream = fs.createWriteStream(uploadedImageSavePath);
        
        file.pipe(fstream);
        fstream.on('close', function () {
            console.log('map uploaded');
            mostRecentRawImagePath = uploadedImageSavePath;
            res.sendStatus(200);
        });
        // should do something for a failure as well
    });

});

// For the DM sending out fogged maps to be distributed to players
app.post('/send', function (req, res) {
    var imageDataString = req.body.imageData;
    
    if (imageDataString) {
        var imageData = decodeBase64Image(imageDataString).data;
        
        fs.writeFile(GENERATED_IMAGE_PATH, imageData, function (err) {
            console.log('sent map saved');
        });
      
        // Cache the data for future requests
        mostRecentImageData = imageDataString;
        
        // ACK for DM
        res.json({
            'success': true,
            'responseText': 'Image successfully uploaded'
        });
        
        // Send the map update to players
        io.emit('map update', {
            'imageData': imageDataString
        });
    } else {
        res.json({
            'success': false,
            'responseText': 'Image not uploaded successfully'
        });
    }
  
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    console.log(err);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

io.on('connection', function(socket) {
      console.log('a user connected');
      
      if (mostRecentImageData) {
          console.log('sending current map to newly connected user');
          socket.emit('map update', {
              'imageData': mostRecentImageData
          });
      }
      
      socket.on('disconnect', function() {
          console.log('a user disconnected'); 
      });
});

function decodeBase64Image(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
      response = {};
  
    if (matches.length !== 3) {
      return new Error('Invalid input string');
    }
  
    response.type = matches[1];
    response.data = new Buffer(matches[2], 'base64');
  
    return response;
}

function deleteExistingMapFilesSync() {
    var files = fs.readdirSync(UPLOADS_DIR);
    files.filter(function(file) { 
        return file.indexOf('map.') > -1; 
    }).forEach(function(file) { 
        var filePath = path.join(UPLOADS_DIR + file);
        fs.unlinkSync(filePath);
    });
}

module.exports = app;
