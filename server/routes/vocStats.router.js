// server/routes/vocStats.router.js
const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { getVocStats } = require("../services/vocService");

const router = express.Router();

router.use(verifyToken);

router.get("/", async (req, res) => {
  const { storeId, year, month, compare } = req.query;
  try {
    const result = await getVocStats({
      storeId,
      year: Number(year),
      month: Number(month),
      compare: compare === "true",
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
