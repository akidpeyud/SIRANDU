const express = require("express");
const router = express.Router();
const {
  getAirBersihGeoJSON,
  getAirBersihTerdekat,
  getAllAirBersih,
  createAirBersih,
  updateAirBersih,
  deleteAirBersih,
} = require("../controllers/airBersihController");

// F08: Endpoint GeoJSON untuk React-Leaflet (?layak=true)
router.get("/geojson", getAirBersihGeoJSON);

// F08: Endpoint Titik Air Terdekat dari GPS User (?lat=-1.61&lng=103.61&limit=3)
router.get("/terdekat", getAirBersihTerdekat);

// CRUD Standar (F08 & F10 Panel Admin)
router.get("/", getAllAirBersih);
router.post("/", createAirBersih);
router.put("/:id", updateAirBersih);
router.delete("/:id", deleteAirBersih);

module.exports = router;
