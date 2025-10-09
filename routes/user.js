const express = require('express');

const router = express.Router();

router.get('/info', async (req, res) => {
  
  if(!req.session.isAuthenticated) {
    res.redirect('/');
    return;
  }

  res.render('info', req.session.userData);
});

module.exports = router;

