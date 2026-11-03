const express = require("express");
const router = express.Router();
const { getRuteEvakuasi } = require("../controllers/evakuasiController");

// F09: Navigasi Rute Evakuasi Teraman (pgRouting)
router.post("/rute", getRuteEvakuasi);

module.exports = router;
