const express = require('express');
const geoip = require('geoip-lite');

const router = express.Router();

router.get('/', async (req, res) => {
  res.redirect('/auth/login');
});

router.get('/geoip', async (req, res) => {
  const ip = req.ip;
  console.log('client ip', ip);
  geo = geoip.lookup(ip);

  res.send({
    country: (geo ? geo.country : 'vn').toLowerCase(),
    ip
  });
});

module.exports = router;

