const express = require("express");
const router = express.Router();
const {
  getGrafikWilayah,
  inputDanEvaluasiCuaca,
} = require("../controllers/pemantauanController");

// F04: Data Tren Curah Hujan untuk Grafik (?days=7)
router.get("/grafik/:wilayah_id", getGrafikWilayah);

// F04 & F05 & F10: Input Pemantauan Cuaca & Evaluasi Status Otomatis
router.post("/input", inputDanEvaluasiCuaca);

module.exports = router;
