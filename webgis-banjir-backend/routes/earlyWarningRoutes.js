const express = require("express");
const router = express.Router();
const {
  getRingkasan,
  getZonaDampak,
} = require("../controllers/earlyWarningController");

// Endpoint: GET /api/peringatan-dini
router.get("/", getRingkasan);

// Endpoint: GET /api/peringatan-dini/zona-bahaya/:id?radius=500
router.get("/zona-bahaya/:id", getZonaDampak);

module.exports = router;
