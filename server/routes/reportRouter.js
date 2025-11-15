const express = require('express');
const router = express.Router();
router.get("/", (req, res) => res.send("Report Router OK"));
module.exports = router;