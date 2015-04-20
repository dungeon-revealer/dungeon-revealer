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

var mostRecentImageData = null;


app.use(busboy()); 

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Not sure why this is needed, Chrome seems to grab the favicon just fine anyway
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
// TODO: Move this logic somewhere else
app.get('/', function (req, res) {
    res.render('player', {dm: false, title: 'Dungeon Revealer'});
});
app.get('/dm', function (req, res) {
    res.render('dm', {dm: true, title: 'Dungeon Revealer DM Console'});
});

app.post('/upload', function (req, res) {
  
    var appDir = path.dirname(require.main.filename),
        fileName = 'map.png',
        filePath = appDir + '/../uploads/' + fileName,
        imageData = req.body.imageData,
        fstream;
    
    req.pipe(req.busboy);

    req.busboy.on('file', function (fieldname, file, filename) {
        console.log('Uploading: ' + filename); 
        fstream = fs.createWriteStream(__dirname + '/public/uploads/map.png');
        file.pipe(fstream);
        fstream.on('close', function () {
            console.log('map saved');
            res.sendStatus(200);
        });
        // should do something for a failure as well
    });

});


app.post('/send', function (req, res) {
    var imageData = req.body.imageData;
        
    if (imageData) {
        mostRecentImageData = imageData;
        res.json({
            'success': true,
            'responseText': 'Image successfully uploaded'
        });
        
        io.emit('map update', {
            'imageData': imageData
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

module.exports = app;
