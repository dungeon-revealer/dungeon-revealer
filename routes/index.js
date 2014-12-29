var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  res.render('index', { dm: false, title: 'Dungeon Revealer' });
});

module.exports = router;
