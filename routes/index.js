const express = require('express');
const geoip = require('geoip-lite');
const path = require('path');
const fs = require('fs');
const config = require('config');
const logger = require('../utils/logger');

const router = express.Router();

const { deepMerge } = require('../utils/helpers');

// Load app_config.json and merge with app_config from default.json if exists
const appConfigPath = path.join(__dirname, '..', 'config', 'app_config.json');
const defaultAppConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));

const appConfig = config.app_config ? deepMerge(defaultAppConfig, config.app_config) : defaultAppConfig;

router.get('/', async (req, res) => {
  res.redirect('/auth/login');
});

router.get('/api/geoip', async (req, res) => {
  const default_country_code = res.locals.default_country_code || 'rs';
  try {
    const ip = req.ip;
    logger.log('client ip', ip);
    const geo = geoip.lookup(ip);

    res.send({
      country: (geo ? geo.country : default_country_code).toLowerCase(),
      ip
    });
  } catch (error) {
    logger.error('GeoIP lookup error:', error);
    res.send({
      country: default_country_code,
      ip: req.ip
    });
  }
});

router.get('/api/config', (req, res) => {
  const { auth_servers, realm, clients, baseUrl } = res.locals;
  const safeClients = Array.isArray(clients)
    ? clients.map(({ client_secret, ...client }) => ({
      ...client,
      redirect_uri: `${baseUrl}/auth/callback/${client.user_flow}`
    }))
    : [];

  res.send({
    auth_servers,
    realm,
    clients: safeClients,
    app_config: appConfig
  });
});

module.exports = router;
