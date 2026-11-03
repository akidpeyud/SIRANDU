const express = require("express");
const router = express.Router();
const {
  getCuacaSemuaKecamatan,
  getDetailCuacaKecamatan,
  triggerManualSync,
} = require("../controllers/cuacaController");

// 1. GET /api/cuaca - Ringkasan 11 Kecamatan Kota Jambi (Leaflet & Dashboard)
router.get("/", getCuacaSemuaKecamatan);

// 2. GET /api/cuaca/:id_kecamatan - Detail curah hujan & grafik 24 jam (F04 & F05)
router.get("/:id_kecamatan", getDetailCuacaKecamatan);

// 3. POST /api/cuaca/sync-manual - Trigger manual scheduler
router.post("/sync-manual", triggerManualSync);

module.exports = router;
