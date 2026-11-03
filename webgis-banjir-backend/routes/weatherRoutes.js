const express = require("express");
const router = express.Router();
const {
  getCuacaSemuaKecamatan,
  getDetailCuacaKecamatan,
  triggerManualSync,
} = require("../controllers/weatherController");

// 1. GET /api/cuaca - Ringkasan 11 Kecamatan Kota Jambi (Untuk peta Leaflet & dashboard)
router.get("/", getCuacaSemuaKecamatan);

// 2. GET /api/cuaca/:id_kecamatan - Detail curah hujan & data grafik 24 jam
router.get("/:id_kecamatan", getDetailCuacaKecamatan);

// 3. POST /api/cuaca/sync-manual - Eksekusi manual scheduler cuaca
router.post("/sync-manual", triggerManualSync);

module.exports = router;
