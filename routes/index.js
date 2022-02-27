const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
  res.redirect('/auth/login');
});

module.exports = router;

