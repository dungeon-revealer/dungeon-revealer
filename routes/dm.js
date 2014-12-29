/*var express = require('express');
var router = express.Router();
var path = require('path'); // move later

router.get('/', function(req, res) {
  res.render('dm', { dm: true, title: 'Dungeon Revealer DM Console' });
});

router.get('/test', function(req, res) {
  res.render('player', { dm: false, title: 'Dungeon Revealer' });
});


module.exports = router;*/
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path'); // move later

exports.console = function(req, res) {
  res.render('dm', { dm: true, title: 'Dungeon Revealer DM Console' });
};

exports.upload = function(req, res) {
  function randomInt() {
    return Math.floor(Math.random() * 999999999);
  }

  console.log("image uploaded");
  var appDir = path.dirname(require.main.filename);
  console.log("done");
  console.log(appDir);
  var    fileName = "image" + randomInt().toString() + ".png",
      filePath = appDir + "/../uploads/" + fileName,
      imageData = req.body.imageData;

  if (imageData) {
      res.json({
        "success":true,
        "responseText":"Image successfully uploaded"
      });
  } else  {
      console.dir(err);
      res.json({
        "success":false,
        "responseText":"Image not uploaded successfully"
      });
  }

  io.emit('map update', { "imageData":imageData });
  console.log('map updated');
/*  console.log(filePath);
  var buff = new Buffer(req.body.imageData
    .replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');

  fs.writeFile(filePath, buff, function (err) {
    if (err) {
      console.log('error writing image to disk');
      console.dir(err);
      res.json({
        "success":false,
        "responseText":"Image not uploaded successfully"
      });
    } else {
      res.json({
        "success":true,
        "responseText":"Image successfully uploaded"
      });
    }
  });
  */

};