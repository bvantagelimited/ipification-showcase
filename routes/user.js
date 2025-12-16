const express = require('express');

const router = express.Router();

router.get('/info', async (req, res) => {
  if (!req.session.isAuthenticated) {
    res.redirect('/');
    return;
  }

  try {
    res.render('info', req.session.userData);
  } catch (error) {
    console.error('Error rendering user info:', error);
    res.redirect('/');
  }
});

module.exports = router;

