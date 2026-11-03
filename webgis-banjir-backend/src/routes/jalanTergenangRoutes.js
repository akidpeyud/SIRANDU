const express = require("express");
const router = express.Router();
const { getJalanTergenangGeoJSON } = require("../controllers/jalanTergenangController");

// 1. GET /api/jalan-tergenang/geojson - FeatureCollection LineString ruas jalan tergenang
router.get("/geojson", getJalanTergenangGeoJSON);
router.get("/", getJalanTergenangGeoJSON);

module.exports = router;
