var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  //debug('debug working');
  res.render('index', { dm: false, title: 'Dungeon Revealer' });
});

module.exports = router;
