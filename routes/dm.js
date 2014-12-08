var express = require('express');
var router = express.Router();

/* GET player's page. */
router.get('/', function(req, res) {
  res.render('dm', { dm: true, title: 'Dungeon Revealer DM Console' });
});

module.exports = router;