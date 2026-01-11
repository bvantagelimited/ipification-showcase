const express = require('express');
const geoip = require('geoip-lite');

const router = express.Router();

router.get('/', async (req, res) => {
  res.redirect('/auth/login');
});

router.get('/geoip', async (req, res) => {
  const default_country_code = res.locals.default_country_code || 'rs';
  try {
    const ip = req.ip;
    console.log('client ip', ip);
    const geo = geoip.lookup(ip);

    res.send({
      country: (geo ? geo.country : default_country_code).toLowerCase(),
      ip
    });
  } catch (error) {
    console.error('GeoIP lookup error:', error);
    res.send({
      country: default_country_code,
      ip: req.ip
    });
  }
});

router.get('/api/config', (req, res) => {
  const { auth_server_url, realm, clients } = res.locals;
  const safeClients = Array.isArray(clients)
    ? clients.map(({ client_secret, ...client }) => client)
    : [];

  res.send({
    auth_server_url,
    realm,
    clients: safeClients
  });
});

module.exports = router;
