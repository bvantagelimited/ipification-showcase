const express = require('express');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/info', async (req, res) => {
  if (!req.session.isAuthenticated) {
    res.redirect('/');
    return;
  }

  try {
    res.render('info', req.session.userData);
  } catch (error) {
    logger.error('Error rendering user info:', error);
    res.redirect('/');
  }
});

module.exports = router;
