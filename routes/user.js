const express = require('express');

const router = express.Router();

router.get('/info', async (req, res) => {
  
  if(!req.session.isAuthenticated) {
    res.status(401).send();
    return;
  }

  res.render('info', req.session.userData);
});

module.exports = router;

