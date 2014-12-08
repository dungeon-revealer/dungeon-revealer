var express = require('express');
var router = express.Router();

/* GET player's page. */
router.get('/', function(req, res) {
  res.render('player', { dm: false, title: 'Dungeon Revealer' });
});

module.exports = router;