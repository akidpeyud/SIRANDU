const express = require("express");
const router = express.Router();
const { getTitikBanjirGeoJSON } = require("../controllers/titikBanjirController");

// 1. GET /api/titik-banjir/geojson - FeatureCollection Point titik banjir historis
router.get("/geojson", getTitikBanjirGeoJSON);
router.get("/", getTitikBanjirGeoJSON);

module.exports = router;
