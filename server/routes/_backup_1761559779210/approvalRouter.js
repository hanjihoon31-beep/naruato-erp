const express = require('express');
const Approval = require('../models/Approval.js');

const router = express.Router();

router.get("/", async (_req, res) => {
  const approvals = await Approval.find().sort({ createdAt: -1 });
  res.json(approvals);
});

router.post("/", async (req, res) => {
  const { title, requester } = req.body;
  const newDoc = await Approval.create({ title, requester });
  res.json(newDoc);
});

router.patch("/:id", async (req, res) => {
  const { status } = req.body;
  const updated = await Approval.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  await Approval.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
