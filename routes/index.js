const express = require('express');
const geoip = require('geoip-lite');

const router = express.Router();

router.get('/', async (req, res) => {
  res.redirect('/auth/login');
});

router.get('/geoip', async (req, res) => {
  try {
    const ip = req.ip;
    console.log('client ip', ip);
    const geo = geoip.lookup(ip);

    res.send({
      country: (geo ? geo.country : 'us').toLowerCase(),
      ip
    });
  } catch (error) {
    console.error('GeoIP lookup error:', error);
    res.send({
      country: 'us',
      ip: req.ip
    });
  }
});

module.exports = router;

