var express = require('express');
var router = express.Router();

/* GET player's page. */
router.get('/', function(req, res) {
  res.render('player', { dm: true, title: 'Dungeon Revealer DM Console' });
});

module.exports = router;