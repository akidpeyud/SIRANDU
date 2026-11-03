const express = require("express");
const router = express.Router();
const {
  getAllWilayah,
  getWilayahGeoJSON,
  createWilayah,
} = require("../controllers/wilayahController");

// Endpoint: /api/wilayah
router.get("/", getAllWilayah);

// Endpoint Khusus WebGIS (React-Leaflet): /api/wilayah/geojson
router.get("/geojson", getWilayahGeoJSON);

// Endpoint Tambah Data: POST /api/wilayah
router.post("/", createWilayah);

module.exports = router;
