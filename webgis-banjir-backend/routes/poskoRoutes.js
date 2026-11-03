const express = require("express");
const router = express.Router();
const {
  getPoskoGeoJSON,
  getPoskoTerdekat,
  getAllPosko,
  createPosko,
  updatePosko,
  deletePosko,
} = require("../controllers/poskoController");

// F07: Endpoint GeoJSON untuk React-Leaflet (?aktif=true)
router.get("/geojson", getPoskoGeoJSON);

// F07: Endpoint Posko Terdekat dari GPS User (?lat=-1.61&lng=103.61&limit=3)
router.get("/terdekat", getPoskoTerdekat);

// CRUD Standar (F07 & F10 Panel Admin)
router.get("/", getAllPosko);
router.post("/", createPosko);
router.put("/:id", updatePosko);
router.delete("/:id", deletePosko);

module.exports = router;
