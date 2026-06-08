const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM alerts ORDER BY id ASC').all());
});

module.exports = router;
