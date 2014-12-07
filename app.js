var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var fs = require('fs');

var generate_key = function() {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
};

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
//app.set('env', 'something');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Not sure why this is needed, Chrome seems to grab the favicon just fine anyway
// Maybe for cross-browser support
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));

// Needed to handle JSON posts
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));

// Cookie parsing needed for sessions
app.use(cookieParser());
// Consider all URLs under /public/ as static files, and return them raw.
app.use(express.static(path.join(__dirname, 'public')));
// Session framework
app.use(session({secret: generate_key()}));
console.log(generate_key());

app.use('/', routes);
app.use('/users', users);

function randomInt() {
    return Math.floor(Math.random() * 999999999);
}


app.post('/upload', function(req, res) {
  console.log("upload");
  console.log(req.body.imageData);
  var appDir = path.dirname(require.main.filename),
      fileName = "image" + randomInt().toString() + ".png",
      filePath = appDir + "/../uploads/" + fileName;
  console.log(filePath);
  var buff = new Buffer(req.body.imageData
    .replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');

  fs.writeFile(filePath, buff, function (err) {
    console.log('done');
    if (err) {
      console.log('error writing image to disk');
      console.dir(err);
      res.json({'response':"Error"});
    } else {
      res.json({'response':"Saved"});
    }
  });
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


app.get('/uploads/:file', function (req, res){
    file = req.params.file;
    var dirname = "/uploads";
    var img = fs.readFileSync(dirname + "/uploads/" + file);
    res.writeHead(200, {'Content-Type': 'image/png' });
    res.end(img, 'binary');
});


function getName(req, res) {
  if (req.session.name) {
    return res.json({ name: req.session.name });
  }
  else {
    return res.json({ name: '' });
  }
}

function setName(req, res) {
  if(!req.body.hasOwnProperty('name')) {
    res.statusCode = 400;
    return res.json({ error: 'Invalid message' });
  }
  else {
    req.session.name = req.body.name;
    return res.json({ name: req.body.name });
  }
}

function logout(req, res) {
  req.session = null;
  return res.json({});
}


app.get('/name', getName);
app.post('/name', setName);
app.get('/logout', logout);

module.exports = app;
